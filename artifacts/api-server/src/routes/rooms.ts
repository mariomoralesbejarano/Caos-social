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
} from "@workspace/api-zod";
import {
  createRoom,
  drawCard,
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
} from "../lib/rooms";

const router: IRouter = Router();

router.post("/rooms", async (req, res): Promise<void> => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { room, playerId } = createRoom(parsed.data);
  res.status(201).json({ playerId, room: serializeRoom(room, playerId) });
});

router.post("/rooms/:code/join", async (req, res): Promise<void> => {
  const params = JoinRoomParams.safeParse(req.params);
  const body = JoinRoomBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = joinRoom(params.data.code, body.data);
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
  const room = getRoom(params.data.code);
  if (!room) {
    res.status(404).json({ error: "Sala no encontrada" });
    return;
  }
  touchPlayer(params.data.code, query.data.playerId);
  res.json(serializeRoom(room, query.data.playerId));
});

router.post("/rooms/:code/tags", async (req, res): Promise<void> => {
  const params = SetMyTagsParams.safeParse(req.params);
  const body = SetMyTagsBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = setMyTags(params.data.code, body.data.playerId, body.data.tags);
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
  const result = startGame(params.data.code, body.data.playerId);
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
  const result = drawCard(params.data.code, body.data.playerId);
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
  const result = throwCard(
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
  const result = respondToThrow(
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
  const result = panicVote(
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

router.post("/rooms/:code/reset", async (req, res): Promise<void> => {
  const params = ResetRoomParams.safeParse(req.params);
  const body = ResetRoomBody.safeParse(req.body);
  if (!params.success || !body.success) {
    res.status(400).json({ error: "Bad request" });
    return;
  }
  const result = resetRoom(params.data.code, body.data.playerId);
  if ("error" in result) {
    res.status(400).json({ error: result.error });
    return;
  }
  res.json(serializeRoom(result, body.data.playerId));
});

export default router;
