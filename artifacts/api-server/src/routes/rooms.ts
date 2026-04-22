import { Router, type IRouter } from "express";
import {
  CreateRoomBody,
  JoinRoomBody,
  JoinRoomParams,
  GetRoomParams,
  GetRoomQueryParams,
  SetMyTagsBody,
  SetMyTagsParams,
  StartGameBody,
  StartGameParams,
  DrawCardBody,
  DrawCardParams,
  ThrowCardBody,
  ThrowCardParams,
  RespondToThrowBody,
  RespondToThrowParams,
  PanicVoteBody,
  PanicVoteParams,
  ResetRoomBody,
  ResetRoomParams,
  AddCustomCardBody,
  AddCustomCardParams,
  UsePowerBody,
  UsePowerParams,
  EndGameBody,
  EndGameParams,
} from "@workspace/api-zod";
import {
  addCustomCard,
  createRoom,
  drawCard,
  endGame,
  getRoom,
  joinRoom,
  panicVote,
  resetRoom,
  respondToThrow,
  serializeRoom,
  setMyTags,
  startGame,
  throwCard,
  touchPlayer,
  usePower,
} from "../lib/rooms";

const router: IRouter = Router();

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { room, playerId } = await createRoom(parsed.data);
  res.status(201).json({ playerId, room: serializeRoom(room, playerId) });
});

router.post("/rooms/:code/join", async (req, res): Promise<void> => {
  const params = JoinRoomParams.safeParse(req.params);
  const body = JoinRoomBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await joinRoom(params.data.code, body.data);
  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.json({
    playerId: result.playerId,
    room: serializeRoom(result.room, result.playerId),
  });
});

router.get("/rooms/:code", async (req, res): Promise<void> => {
  const params = GetRoomParams.safeParse(req.params);
  const query = GetRoomQueryParams.safeParse(req.query);
  if (!params.success || !query.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const room = await getRoom(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Sala no encontrada" });
    return;
  }
  void touchPlayer(params.data.code, query.data.playerId);
  res.json(serializeRoom(room, query.data.playerId));
});

router.post("/rooms/:code/tags", async (req, res): Promise<void> => {
  const params = SetMyTagsParams.safeParse(req.params);
  const body = SetMyTagsBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await setMyTags(
    params.data.code,
    body.data.playerId,
    body.data.tags,
  );
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/start", async (req, res): Promise<void> => {
  const params = StartGameParams.safeParse(req.params);
  const body = StartGameBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await startGame(params.data.code, body.data.playerId);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/draw", async (req, res): Promise<void> => {
  const params = DrawCardParams.safeParse(req.params);
  const body = DrawCardBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await drawCard(params.data.code, body.data.playerId);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json({
    drawnCard: result.drawnCard,
    room: serializeRoom(result.room, body.data.playerId),
  });
});

router.post("/rooms/:code/throw", async (req, res): Promise<void> => {
  const params = ThrowCardParams.safeParse(req.params);
  const body = ThrowCardBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await throwCard(
    params.data.code,
    body.data.playerId,
    body.data.toPlayerId,
    body.data.cardId,
  );
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/respond", async (req, res): Promise<void> => {
  const params = RespondToThrowParams.safeParse(req.params);
  const body = RespondToThrowBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await respondToThrow(
    params.data.code,
    body.data.playerId,
    body.data.throwId,
    body.data.action,
  );
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/panic-vote", async (req, res): Promise<void> => {
  const params = PanicVoteParams.safeParse(req.params);
  const body = PanicVoteBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await panicVote(
    params.data.code,
    body.data.playerId,
    body.data.throwId,
    body.data.against,
  );
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/custom-cards", async (req, res): Promise<void> => {
  const params = AddCustomCardParams.safeParse(req.params);
  const body = AddCustomCardBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await addCustomCard(params.data.code, body.data.playerId, {
    title: body.data.title,
    effect: body.data.effect,
    points: body.data.points,
  });
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/use-power", async (req, res): Promise<void> => {
  const params = UsePowerParams.safeParse(req.params);
  const body = UsePowerBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await usePower(
    params.data.code,
    body.data.playerId,
    body.data.cardId,
    body.data.targetPlayerId,
  );
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/end-game", async (req, res): Promise<void> => {
  const params = EndGameParams.safeParse(req.params);
  const body = EndGameBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await endGame(params.data.code, body.data.playerId);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

router.post("/rooms/:code/reset", async (req, res): Promise<void> => {
  const params = ResetRoomParams.safeParse(req.params);
  const body = ResetRoomBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = await resetRoom(params.data.code, body.data.playerId);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

export default router;
