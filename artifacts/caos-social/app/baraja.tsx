/**
 * Baraja Española — game selector screen.
 * Shows all 10 traditional games with metadata chips and a "Cómo Jugar" modal.
 */

import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RuleSection {
  icon: string;
  heading: string;
  bullets: string[];
}

interface Game {
  id: string;
  emoji: string;
  title: string;
  tagline: string;
  players: string;
  duration: string;
  difficulty: "Fácil" | "Medio" | "Difícil";
  sections: RuleSection[];
}

// ─── Game data ────────────────────────────────────────────────────────────────

const GAMES: Game[] = [
  {
    id: "apuestas",
    emoji: "🃏",
    title: "Las Apuestas",
    tagline: "Predice tus bazas, ronda a ronda, hasta el Poker Indio final",
    players: "3-6",
    duration: "30-60 min",
    difficulty: "Difícil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Acumula más puntos prediciendo exactamente cuántas bazas ganarás cada ronda.",
          "Las rondas van de 5 cartas por jugador bajando de una en una hasta 1 carta.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se usa la baraja española de 40 cartas.",
          "Primera ronda: se reparten 5 cartas a cada jugador. Cada ronda siguiente se reparte una menos.",
          "Se elige un triunfo al inicio de cada ronda (puede ser la carta del mazo o decidido de antemano).",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "FASE DE APUESTA — Cada jugador declara cuántas bazas cree que va a ganar.",
          "El último en apostar NO puede elegir un número que haga que la suma de todas las apuestas sea igual al número de cartas de la ronda (regla del desequilibrio).",
          "FASE DE JUEGO — Se juega a bazas normales. Sigue el palo o mata con triunfo.",
          "FASE DE PUNTUACIÓN — +10 si aciertas tu predicción exacta, más 1 punto por cada baza ganada. Si fallas, solo 1 punto por baza ganada (sin bonus).",
        ],
      },
      {
        icon: "👁️",
        heading: "Ronda especial: 1 carta (Poker Indio)",
        bullets: [
          "Cada jugador coge su única carta y se la pone en la frente sin mirarla, de cara al resto.",
          "Cada jugador apuesta si va a ganar o perder la única baza de la ronda, basándose en lo que ve en las frentes ajenas.",
          "El último en apostar sigue la regla del desequilibrio.",
          "Se juega la baza. El ganador suma +10 si acertó, el perdedor resta -5 si se equivocó.",
        ],
      },
    ],
  },
  {
    id: "mentiroso",
    emoji: "👺",
    title: "El Mentiroso",
    tagline: "Descarta boca abajo y decide si creer o acusar",
    players: "3-6",
    duration: "15-30 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Ser el primero en deshacerte de todas tus cartas.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten todas las cartas a partes iguales (puede sobrar alguna que queda en el mazo).",
          "El primer jugador elige qué valor va a declarar esta ronda (ej: 'Ases').",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador activo descarta entre 1 y 4 cartas boca abajo al centro declarando que son del valor de la ronda (ej: 'Dos ases').",
          "Puede mentir: las cartas no tienen por qué ser lo que dice.",
          "Los demás jugadores pueden gritar '¡MENTIRA!' en cualquier momento antes del siguiente turno.",
          "Si acusas y el jugador mentía → el jugador mentiroso recoge todas las cartas del centro.",
          "Si acusas y el jugador decía la verdad → el acusador recoge todas las cartas.",
          "Si nadie acusa, el turno pasa al siguiente jugador con el valor siguiente en secuencia ascendente (Ases → Doses → Treses…).",
        ],
      },
      {
        icon: "⚡",
        heading: "Reglas especiales",
        bullets: [
          "Cuando la secuencia llega al Rey, vuelve a empezar desde el As.",
          "Si alguien llega a 0 cartas, gana automáticamente.",
          "Variante: el acusador nombra el valor exacto que cree que son las cartas; si acierta el número exacto, el mentiroso bebe el doble.",
        ],
      },
    ],
  },
  {
    id: "culo",
    emoji: "👑",
    title: "El Culo / El Rey",
    tagline: "Jerarquía social: quien antes se descarta manda en la ronda siguiente",
    players: "4-8",
    duration: "20-40 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Deshacerte de todas tus cartas antes que los demás para ser el Rey.",
          "El último en quedarse con cartas es el Culo y pagará un precio en la siguiente ronda.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten todas las cartas a partes iguales.",
          "Jerarquía de cartas (mayor a menor): 2, As, Rey, Caballo, Sota, 7, 6, 5, 4, 3.",
          "El jugador con el 3 de Oros inicia la primera partida.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador activo juega una carta o un grupo de cartas iguales (ej: tres 5s).",
          "El siguiente jugador debe superar el valor con igual o mayor cantidad de cartas del mismo tipo, o pasar.",
          "Si todos pasan tras un jugador, ese jugador limpia la mesa y vuelve a jugar.",
          "El primero en quedarse sin cartas es el Rey. El siguiente es el Vicerrey. El último es el Culo.",
        ],
      },
      {
        icon: "🔁",
        heading: "Intercambio inicial de ronda",
        bullets: [
          "El Culo entrega sus 2 mejores cartas al Rey. El Rey devuelve 2 cartas cualesquiera.",
          "El Vicerrey y el penúltimo intercambian 1 carta cada uno.",
          "Los demás comienzan sin cambio.",
          "Revolución: jugar cuatro cartas iguales invierte la jerarquía (el 3 pasa a ser el más alto) hasta la próxima revolución.",
        ],
      },
    ],
  },
  {
    id: "mico",
    emoji: "💃",
    title: "La Puta / El Mico",
    tagline: "Descarta parejas y evita quedarte con el 1 de Oros",
    players: "3-6",
    duration: "15-25 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Deshacerte de todas tus cartas formando parejas.",
          "El jugador que se quede con el 1 de Oros al final pierde la ronda (es la Puta o el Mico).",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se retira el 1 de Copas del mazo (para que el 1 de Oros no tenga pareja posible).",
          "Se reparten todas las cartas a partes iguales.",
          "Al inicio, cada jugador descarta automáticamente todas las parejas que tenga en la mano.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador activo extiende su mano boca abajo hacia el jugador de la izquierda.",
          "El jugador de la izquierda roba 1 carta al azar de la mano extendida.",
          "Si el robador forma pareja con la carta robada, la descarta inmediatamente.",
          "El turno pasa en sentido horario.",
        ],
      },
      {
        icon: "⚡",
        heading: "Final y penalización",
        bullets: [
          "El juego termina cuando todos han descartado sus cartas excepto el poseedor del 1 de Oros.",
          "Ese jugador pierde la ronda. Si se juegan varias rondas, acumula una 'vida' perdida.",
          "Variante: el perdedor debe cumplir un reto del grupo antes de la siguiente ronda.",
        ],
      },
    ],
  },
  {
    id: "pesca",
    emoji: "🎣",
    title: "La Pesca",
    tagline: "Pide cartas a tus rivales y completa familias de cuatro",
    players: "3-6",
    duration: "20-35 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Conseguir el mayor número de familias (4 cartas del mismo número).",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten 7 cartas a cada jugador (5 si hay 5 o más jugadores).",
          "El resto de cartas forma el mazo central boca abajo.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador activo elige a un rival y le pide un número concreto que ya tenga en su mano (ej: '¿Tienes seises?').",
          "Solo puedes pedir números de los que ya tengas al menos una carta.",
          "Si el rival tiene carta(s) de ese número, te las debe dar todas.",
          "Si el rival no tiene ese número → '¡A pescar!' y robas del mazo. Si la carta robada es la pedida, repites turno.",
          "Cuando completas una familia de 4, la colocas visible en tu pila.",
        ],
      },
      {
        icon: "⚡",
        heading: "Final",
        bullets: [
          "El juego termina cuando se han completado todas las familias o el mazo se agota.",
          "Gana quien más familias haya completado.",
          "Empate: gana quien completó la última familia primero.",
        ],
      },
    ],
  },
  {
    id: "cuatrola",
    emoji: "🥇",
    title: "La Cuatrola",
    tagline: "Bazas en parejas con cantes de 20 y 40 y arrastre obligatorio",
    players: "4",
    duration: "30-60 min",
    difficulty: "Difícil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Juego de parejas (2vs2). La pareja que primero alcance 101 puntos gana.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se usa la baraja española de 48 cartas (con 8s, 9s y 10s).",
          "Se reparten 12 cartas a cada jugador.",
          "El palo de triunfo se establece por la última carta del mazo antes de repartir.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno y bazas",
        bullets: [
          "Se juega a bazas. El jugador activo lidera con una carta.",
          "Los demás siguen el palo si pueden; si no, pueden echar triunfo o fallar.",
          "Arrastre obligatorio: si tienes cartas de triunfo, debes jugar triunfo cuando el liderador juega triunfo.",
          "La baza la gana quien eche el triunfo más alto o la carta del palo liderador más alta.",
        ],
      },
      {
        icon: "🎤",
        heading: "Cantes",
        bullets: [
          "Rey + Sota del mismo palo → puedes cantar '20' (palo normal) o '40' (si es triunfo).",
          "Solo se puede cantar al inicio de tu turno antes de jugar una de las dos cartas del cante.",
          "Los puntos del cante se suman al marcador de tu pareja en el momento del cante.",
        ],
      },
      {
        icon: "🏆",
        heading: "Puntuación",
        bullets: [
          "As=11 pts · Tres=10 pts · Rey=4 pts · Caballo=3 pts · Sota=2 pts.",
          "El resto de cartas valen 0.",
          "Total en juego por ronda: 120 puntos de bazas + cantes.",
          "La pareja que haya ganado más puntos en bazas puede contar sus puntos. La perdedora no suma.",
        ],
      },
    ],
  },
  {
    id: "tute",
    emoji: "🏆",
    title: "El Tute / Guiñote",
    tagline: "Cantes de 20 y 40, bazas y el Tute de Reyes que lo gana todo",
    players: "2-4",
    duration: "20-45 min",
    difficulty: "Medio",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Ser el primero en llegar a 101 puntos (o la puntuación acordada).",
          "Ganar bazas con cartas de valor y cantar combinaciones.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "4 jugadores (parejas): 8 cartas por jugador. La carta siguiente del mazo revela el triunfo.",
          "2 jugadores: 6 cartas por jugador, misma mecánica.",
          "El triunfo del palo revelado tiene jerarquía superior a cualquier otro palo.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno y bazas",
        bullets: [
          "El jugador activo juega una carta.",
          "Los demás deben seguir el palo jugado si pueden. Si no tienen del palo, pueden matar con triunfo o fallar.",
          "La baza la gana la carta de triunfo más alta o la del palo liderador más alta.",
          "El ganador de la baza lidera la siguiente.",
        ],
      },
      {
        icon: "🎤",
        heading: "Cantes",
        bullets: [
          "Rey + Caballo del mismo palo → '20 en mano' (palo normal) o '40 en mano' (palo de triunfo).",
          "Se declara al inicio del turno, antes de jugar.",
          "Solo se puede cantar una vez por turno. Los puntos se suman inmediatamente.",
        ],
      },
      {
        icon: "⚡",
        heading: "Tute y reglas especiales",
        bullets: [
          "Tute de Reyes: si un jugador colecta los 4 Reyes en su pila de bazas, gana la partida automáticamente.",
          "Tute de Caballos: lo mismo con los 4 Caballos.",
          "Puntuación de cartas: As=11 · Tres=10 · Rey=4 · Caballo=3 · Sota=2.",
          "Tras agotar el mazo, los jugadores deben seguir el palo Y superar la carta liderada si pueden.",
        ],
      },
    ],
  },
  {
    id: "7ymedio",
    emoji: "🎲",
    title: "El 7 y Medio",
    tagline: "Acércate al 7.5 sin pasarte · Las figuras valen medio punto",
    players: "2-8",
    duration: "20-40 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Conseguir una puntuación lo más cercana a 7.5 sin superarla.",
          "Superar a la banca (o al jugador que hace de banca) con más puntos.",
        ],
      },
      {
        icon: "🃏",
        heading: "Valor de las cartas",
        bullets: [
          "As=1 · 2=2 · 3=3 · 4=4 · 5=5 · 6=6 · 7=7.",
          "Sota, Caballo y Rey = 0.5 puntos cada uno (medio punto).",
        ],
      },
      {
        icon: "🏦",
        heading: "Rondas y la banca",
        bullets: [
          "Un jugador hace de banca (rota tras cada ronda o queda fijo según reglas acordadas).",
          "Los demás jugadores apuestan fichas/puntos antes de recibir su primera carta.",
          "La banca reparte 1 carta boca arriba a cada jugador y mantiene la suya boca abajo.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno del jugador",
        bullets: [
          "Cada jugador (de izquierda a derecha) decide: PEDIR carta ('dame') o PLANTARSE.",
          "Si la suma supera 7.5, el jugador 'se pasa' y pierde su apuesta inmediatamente.",
          "Tras que todos jueguen, la banca revela su carta y decide si pide o se planta.",
        ],
      },
      {
        icon: "⚡",
        heading: "Resultados y especiales",
        bullets: [
          "Si la banca se pasa, paga a todos los que sigan en juego.",
          "Si empatan banca y jugador → la banca gana.",
          "7 y Medio Natural: conseguir 7.5 con solo 2 cartas (una figura + un 7) → la banca paga el doble.",
          "Si la banca saca 7 y Medio Natural → cobra el doble a todos.",
        ],
      },
    ],
  },
  {
    id: "chinchon",
    emoji: "🎴",
    title: "El Chinchón",
    tagline: "Forma tríos y escaleras para cerrar la mano antes que todos",
    players: "2-6",
    duration: "20-40 min",
    difficulty: "Medio",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Cerrar la mano con el menor número de puntos en cartas 'libres' (no combinadas).",
          "El juego dura hasta que alguien alcanza -100 puntos (o la cifra acordada).",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten 7 cartas a cada jugador.",
          "El mazo central queda boca abajo. Se voltea 1 carta para iniciar el descarte.",
          "El As puede valer 1 o el número más alto del palo (según se acuerde antes de empezar).",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador activo roba del mazo central O de la carta de descarte visible.",
          "Organiza su mano en combinaciones mentalmente.",
          "Descarta 1 carta boca arriba sobre el mazo de descarte.",
          "Combinaciones válidas: Trío (3+ cartas del mismo número) · Escalera (3+ cartas consecutivas del mismo palo).",
        ],
      },
      {
        icon: "🚪",
        heading: "Cerrar",
        bullets: [
          "Cuando un jugador puede combinar todas sus cartas (puntos libres = 0), puede cerrar.",
          "Cierra descartando boca abajo sobre la pila y declarando 'Cierro'.",
          "Los demás jugadores tienen 1 turno más para mejorar su mano.",
          "Tras ese turno, todos revelan y cuentan sus cartas libres (= puntos negativos).",
          "El jugador que cerró suma 0 si cerró con mano limpia, o su valor si tenía cartas libres.",
        ],
      },
      {
        icon: "⚡",
        heading: "Chinchón y especiales",
        bullets: [
          "Chinchón: tener las 7 cartas formando una escalera del mismo palo → gana la ronda automáticamente.",
          "Los rivales suman el doble de sus puntos libres cuando alguien hace Chinchón.",
          "Si quien cierra tiene más puntos libres que otro jugador → suma 10 puntos extra de penalización.",
        ],
      },
    ],
  },
  {
    id: "burro",
    emoji: "🐂",
    title: "El Burro",
    tagline: "Pasa cartas a toda velocidad · El último en tocar pierde una letra",
    players: "3-6",
    duration: "10-20 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Ser el primero en conseguir 4 cartas del mismo número y tocar la pantalla (o la mesa).",
          "Evitar ser el último en tocar y acumular las letras de B-U-R-R-O.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se seleccionan tantos grupos de 4 cartas del mismo número como jugadores haya (ej: cuatro 1s, cuatro 3s, cuatro 7s para 3 jugadores).",
          "Se reparten 4 cartas a cada jugador.",
          "Todos los jugadores miran su mano sin mostrarla.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno (simultáneo)",
        bullets: [
          "¡No hay turnos! El paso es simultáneo y continuo.",
          "Cada jugador selecciona 1 carta no deseada y la desliza boca abajo al jugador de su izquierda.",
          "Nadie puede tener más de 4 cartas en la mano en ningún momento.",
          "El ritmo puede ser libre o marcado por un árbitro que cuenta en voz alta.",
        ],
      },
      {
        icon: "🤫",
        heading: "Victoria y caída",
        bullets: [
          "En cuanto un jugador consigue 4 cartas del mismo número, toca DISCRETAMENTE la pantalla/mesa.",
          "Los demás jugadores deben tocar también lo antes posible al percatarse.",
          "El ÚLTIMO en tocar recibe una letra de 'BURRO' (B primero, luego U, R, R, O).",
          "Quien complete la palabra 'BURRO' pierde la partida.",
          "Truco: algunos jugadores tocan aunque no tengan las 4 cartas para despistar. ¡Ojo!",
        ],
      },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BarajaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const diffColor = (d: Game["difficulty"]) =>
    d === "Fácil" ? colors.primary : d === "Medio" ? "#FFB800" : colors.destructive;

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: (isWeb ? 67 : insets.top) + 20,
            paddingBottom: (isWeb ? 34 : insets.bottom) + 48,
          },
        ]}
      >
        {/* ── Back ── */}
        <Pressable
          onPress={() => router.replace("/")}
          style={[styles.back, { borderColor: colors.border }]}
        >
          <Text style={{ fontSize: 16 }}>🏠</Text>
          <Text style={[styles.backText, { color: colors.mutedForeground }]}>
            Menú Principal
          </Text>
        </Pressable>

        {/* ── Hero ── */}
        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: colors.secondary }]}>
            · JUEGOS TRADICIONALES ·
          </Text>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            🎴 BARAJA{"\n"}
            <Text style={{ color: colors.primary }}>ESPAÑOLA</Text>
          </Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>
            {GAMES.length} juegos · Pulsa{" "}
            <Text style={{ color: colors.secondary }}>📖 Cómo Jugar</Text>
            {" "}para ver las reglas completas
          </Text>
        </View>

        {/* ── Game list ── */}
        {GAMES.map((game) => (
          <View
            key={game.id}
            style={[
              styles.card,
              { borderColor: colors.border, backgroundColor: colors.card },
            ]}
          >
            {/* top accent */}
            <View
              style={[
                styles.cardAccent,
                { backgroundColor: diffColor(game.difficulty) },
              ]}
            />

            {/* header row */}
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>{game.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>
                  {game.title}
                </Text>
                <Text
                  style={[styles.cardTagline, { color: colors.mutedForeground }]}
                  numberOfLines={2}
                >
                  {game.tagline}
                </Text>
              </View>
            </View>

            {/* meta chips */}
            <View style={styles.metaRow}>
              <Chip label={`👥 ${game.players}`} color={colors.mutedForeground} bg={colors.background} />
              <Chip label={`⏱ ${game.duration}`} color={colors.mutedForeground} bg={colors.background} />
              <Chip
                label={game.difficulty}
                color={diffColor(game.difficulty)}
                bg={diffColor(game.difficulty) + "22"}
              />
            </View>

            {/* action buttons */}
            <View style={styles.actions}>
              <Pressable
                onPress={() => setSelectedGame(game)}
                style={[
                  styles.rulesBtn,
                  { borderColor: colors.secondary, backgroundColor: colors.secondary + "18" },
                ]}
              >
                <Text style={[styles.rulesBtnText, { color: colors.secondary }]}>
                  📖  Cómo Jugar
                </Text>
              </Pressable>

              <View
                style={[
                  styles.comingBtn,
                  { borderColor: colors.border },
                ]}
              >
                <Text style={[styles.comingText, { color: colors.mutedForeground }]}>
                  🎮  Próximamente
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Rules modal ── */}
      <GameRulesModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />
    </>
  );
}

// ─── GameRulesModal ───────────────────────────────────────────────────────────

function GameRulesModal({
  game,
  onClose,
}: {
  game: Game | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!game) return null;

  const diffColor =
    game.difficulty === "Fácil"
      ? colors.primary
      : game.difficulty === "Medio"
        ? "#FFB800"
        : colors.destructive;

  return (
    <Modal
      visible={!!game}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: "#00000090" }]}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            styles.modalPanel,
            {
              backgroundColor: colors.background,
              borderColor: colors.secondary,
              paddingBottom: (insets.bottom || 20) + 16,
            },
          ]}
        >
          {/* drag handle */}
          <View
            style={[styles.handle, { backgroundColor: colors.border }]}
          />

          {/* header */}
          <View style={styles.modalHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Text style={styles.modalEmoji}>{game.emoji}</Text>
              <View>
                <Text
                  style={[styles.modalTitle, { color: colors.foreground }]}
                >
                  {game.title}
                </Text>
                <Text
                  style={[styles.modalTagline, { color: colors.mutedForeground }]}
                >
                  {game.tagline}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              style={[styles.modalClose, { borderColor: colors.border }]}
            >
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontFamily: "Inter_700Bold",
                  fontSize: 16,
                }}
              >
                ✕
              </Text>
            </Pressable>
          </View>

          {/* meta chips */}
          <View style={[styles.metaRow, { paddingHorizontal: 20 }]}>
            <Chip
              label={`👥 ${game.players} jugadores`}
              color={colors.mutedForeground}
              bg={colors.card}
            />
            <Chip
              label={`⏱ ${game.duration}`}
              color={colors.mutedForeground}
              bg={colors.card}
            />
            <Chip
              label={game.difficulty}
              color={diffColor}
              bg={diffColor + "22"}
            />
          </View>

          {/* scrollable sections */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {game.sections.map((section, si) => (
              <View
                key={si}
                style={[
                  styles.section,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionIcon}>{section.icon}</Text>
                  <Text
                    style={[
                      styles.sectionTitle,
                      { color: colors.primary },
                    ]}
                  >
                    {section.heading}
                  </Text>
                </View>
                {section.bullets.map((bullet, bi) => (
                  <View key={bi} style={styles.bullet}>
                    <View
                      style={[
                        styles.bulletDot,
                        { backgroundColor: colors.secondary },
                      ]}
                    />
                    <Text
                      style={[
                        styles.bulletText,
                        { color: colors.foreground },
                      ]}
                    >
                      {bullet}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Chip helper ─────────────────────────────────────────────────────────────

function Chip({
  label,
  color,
  bg,
}: {
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 20 },

  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  backText: { fontFamily: "Inter_500Medium", fontSize: 13 },

  hero: { gap: 6 },
  eyebrow: { fontFamily: "Inter_700Bold", fontSize: 11, letterSpacing: 2.5 },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 44,
    lineHeight: 48,
    letterSpacing: -1,
  },
  heroSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },

  // card
  card: {
    borderRadius: 16,
    borderWidth: 2,
    overflow: "hidden",
    gap: 14,
    padding: 16,
  },
  cardAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
  },
  cardEmoji: { fontSize: 32, lineHeight: 38, width: 38 },
  cardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 22,
  },
  cardTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },

  metaRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },

  actions: { flexDirection: "row", gap: 10 },
  rulesBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
  },
  rulesBtnText: { fontFamily: "Inter_700Bold", fontSize: 13 },
  comingBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    borderStyle: "dashed",
  },
  comingText: { fontFamily: "Inter_500Medium", fontSize: 12 },

  // chip
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: { fontFamily: "Inter_700Bold", fontSize: 11 },

  // modal
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 0,
    maxHeight: "90%",
    gap: 16,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  modalEmoji: { fontSize: 40, lineHeight: 48 },
  modalTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  modalTagline: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3,
    maxWidth: 220,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // sections
  section: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionIcon: { fontSize: 18, lineHeight: 22 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  bullet: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
    flexShrink: 0,
  },
  bulletText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
});
