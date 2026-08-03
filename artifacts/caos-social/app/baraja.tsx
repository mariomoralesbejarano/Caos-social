/**
 * Baraja Española — game selector screen.
 * Shows 20 traditional games with metadata chips and a "Cómo Jugar" modal.
 * The JUGAR button creates a multiplayer room synced with Supabase.
 */

import { useCreateRoom, useJoinRoom } from "@workspace/api-client-react";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useRoom } from "@/contexts/RoomContext";
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
  // ── 10 NUEVOS JUEGOS ────────────────────────────────────────────────────────
  {
    id: "escoba",
    emoji: "🧹",
    title: "La Escoba",
    tagline: "Suma 15 con las cartas del centro y barre la mesa",
    players: "2-4",
    duration: "20-35 min",
    difficulty: "Medio",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Capturar cartas del centro formando sumas de exactamente 15.",
          "Gana quien más puntos acumule al acabar el mazo.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se usa baraja española de 40 cartas. Figuras valen: Sota=8, Caballo=9, Rey=10.",
          "Se reparten 3 cartas a cada jugador y se colocan 4 cartas boca arriba en el centro.",
          "Si las 4 cartas del centro suman 15, se barajan de nuevo.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador juega 1 carta de su mano intentando capturar 1 o más cartas del centro cuya suma, incluida la jugada, sea exactamente 15.",
          "Si no puede capturar, coloca su carta en el centro.",
          "Cuando los jugadores se quedan sin cartas, se reparten 3 más hasta agotar el mazo.",
          "Las cartas no capturadas al final van al último jugador que capturó.",
        ],
      },
      {
        icon: "🧹",
        heading: "Escoba y puntuación",
        bullets: [
          "ESCOBA: capturar TODAS las cartas del centro en un turno → +1 punto extra.",
          "Puntuación: más cartas totales=1pt · más oros=1pt · 7 de oros=1pt · 7 de copas=1pt · cada escoba=1pt.",
          "Empate en cartas u oros: el punto no se otorga.",
          "Gana quien llegue primero a 21 puntos (o quien más tenga al terminar el mazo).",
        ],
      },
    ],
  },
  {
    id: "brisca",
    emoji: "⚡",
    title: "La Brisca",
    tagline: "Bazas rápidas — Ases y Treses valen puntos clave",
    players: "2-4",
    duration: "15-30 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Capturar cartas de valor en bazas para sumar más de 60 puntos.",
          "As=11 · Tres=10 · Rey=4 · Caballo=3 · Sota=2 · resto=0.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten 3 cartas a cada jugador.",
          "La carta siguiente del mazo queda visible: su palo es el triunfo (briscola).",
          "Esta carta se coloca bajo el mazo y será la última en repartirse.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El primer jugador echa cualquier carta. Los demás echan 1 carta cada uno.",
          "NO hay obligación de seguir palo — puedes echar cualquier carta.",
          "Gana la baza quien eche el triunfo más alto, o (sin triunfos) la carta del palo liderador más alta.",
          "El ganador lidera la siguiente baza y todos roban 1 carta del mazo.",
        ],
      },
      {
        icon: "🏆",
        heading: "Final",
        bullets: [
          "Al agotar el mazo, se juegan las cartas restantes en mano.",
          "Se cuentan los puntos. Más de 60 = victoria. Exacto 60 = victoria del que lidere.",
          "Con 4 jugadores (2 parejas): se suman los puntos de cada pareja.",
        ],
      },
    ],
  },
  {
    id: "remigio",
    emoji: "🎴",
    title: "El Remigio",
    tagline: "Forma combinaciones con 10 cartas y cierra antes que nadie",
    players: "2-5",
    duration: "25-45 min",
    difficulty: "Medio",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Combinar todas las cartas en tríos (mismo número) y escaleras (mismo palo, consecutivas).",
          "Minimizar puntos en cartas sueltas. Acumular menos de 100 para no ser eliminado.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten 10 cartas a cada jugador.",
          "El As puede ir después del Rey (escalera cerrada) o antes del 2 (escalera abierta).",
          "El resto del mazo queda boca abajo; se voltea 1 carta para iniciar el descarte.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "El jugador activo ROBA del mazo o del descarte.",
          "Puede BAJAR combinaciones al centro (mínimo 3 cartas por combinación).",
          "Puede AÑADIR cartas a combinaciones ya bajadas por cualquier jugador.",
          "Descarta 1 carta al final del turno.",
        ],
      },
      {
        icon: "🚪",
        heading: "Cierre y puntuación",
        bullets: [
          "REMIGIO: combinar las 10 cartas en un solo turno sin haber bajado antes → los rivales doblan sus puntos.",
          "Cierre normal: bajar todo y descartar la última carta.",
          "Puntos negativos por cartas sueltas: figuras=-10, As=-15, resto=-valor.",
          "El eliminado acumula 100 puntos negativos. Gana quien quede en pie.",
        ],
      },
    ],
  },
  {
    id: "chanchullo",
    emoji: "💥",
    title: "El Chanchullo",
    tagline: "Velocidad, farol y descarte rápido antes que el resto",
    players: "3-6",
    duration: "10-20 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Ser el primero en deshacerte de todas tus cartas.",
          "Puedes mentir sobre el valor que descartas… si nadie te pilla.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten todas las cartas a partes iguales.",
          "Se establece un orden de valores (As, 2, 3… Rey) que se sigue en cada ronda.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "En tu turno descartas 1-4 cartas boca abajo, declarando un valor (el del turno actual).",
          "Si alguien grita '¡CHANCHULLO!' antes del siguiente turno, se revelan las cartas.",
          "Si mentías → recoges todo el montón.",
          "Si decías la verdad → el acusador recoge el montón y puede elegir 3 cartas para darte.",
          "Nadie acusa → el turno pasa y el valor avanza al siguiente.",
        ],
      },
      {
        icon: "⚡",
        heading: "Comodines",
        bullets: [
          "Los 7s son comodines: pueden declararse como cualquier valor sin ser farol.",
          "Si alguien acusa tus 7s creyendo que son farol → el acusador recibe penalización doble.",
        ],
      },
    ],
  },
  {
    id: "golfo",
    emoji: "👑",
    title: "El Golfo",
    tagline: "Póker tradicional español de 4 cartas — el más bajo gana",
    players: "3-6",
    duration: "20-40 min",
    difficulty: "Medio",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Tener la mano de menor valor al final de la ronda.",
          "El valor de la mano es la suma de tus 4 cartas (figuras=10, As=1).",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten 4 cartas boca abajo a cada jugador.",
          "Los jugadores miran solo sus 2 cartas interiores al inicio.",
          "Se forman apuestas con fichas o puntos.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "En sentido horario: ROBAR del mazo e intercambiar con una de tus 4 cartas (la descartada va boca arriba).",
          "O tomar la carta del descarte visible.",
          "O pasar (sin cambiar nada).",
          "Las cartas boca arriba en el descarte son visibles para todos.",
        ],
      },
      {
        icon: "🎯",
        heading: "Golfo y final",
        bullets: [
          "Cuando crees tener la mano más baja, di '¡GOLFO!' en tu turno.",
          "Los demás tienen 1 turno más para mejorar.",
          "Se revelan todas las manos. El de menor suma gana.",
          "Si el que cantó Golfo NO tiene la menor suma, recibe penalización doble.",
          "Cartas especiales: Rey=0 pts · Sota de Copas = intercambia tu mano con otro jugador.",
        ],
      },
    ],
  },
  {
    id: "cauca",
    emoji: "🃏",
    title: "El Cauca",
    tagline: "Cartas ocultas, memoria y apuestas — conoce tu mano sin mirarla",
    players: "3-5",
    duration: "20-35 min",
    difficulty: "Medio",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Tener la mano de menor valor acumulado al final.",
          "La clave es memorizar tus propias cartas y vigilar las del resto.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "4 cartas boca abajo a cada jugador. Solo puedes mirar tus 2 cartas del extremo izquierdo al inicio.",
          "Valor: figuras=10, As=1, resto=valor numérico.",
          "Rey Rojo (Copas/Espadas): -5 puntos. Rey Negro (Oros/Bastos): +10 puntos.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "ROBAR del mazo: miras la carta y decides si la intercambias con una de las tuyas (sin mirar la tuya) o la descartas.",
          "Si descartas la robada, cualquier otro jugador puede cogerla en lugar de la suya.",
          "Habilidades especiales: 7/8 = espiar una de TUS cartas; 9/10 = espiar una carta AJENA; Sota = intercambiar una tuya con una ajena (a ciegas).",
        ],
      },
      {
        icon: "🔮",
        heading: "Cauca y final",
        bullets: [
          "Cuando crees tener la mano más baja di '¡CAUCA!'.",
          "Todos revelan. El menor suma gana.",
          "Si quien dijo Cauca no gana → recibe +10 puntos de penalización.",
          "Empate: ambos ganan y nadie recibe penalización.",
        ],
      },
    ],
  },
  {
    id: "rueda",
    emoji: "🔄",
    title: "La Rueda (Uno Español)",
    tagline: "Descarta siguiendo palo o número — las figuras tienen efectos especiales",
    players: "2-8",
    duration: "15-30 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Ser el primero en quedarte sin cartas.",
          "Di '¡UNA!' cuando te quede solo 1 carta o recibirás 2 de penalización.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten 7 cartas a cada jugador.",
          "Se voltea 1 carta para iniciar el descarte. El resto es el mazo.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "Descarta 1 carta que coincida en PALO o en NÚMERO con la carta superior del descarte.",
          "Si no puedes, roba 1 carta del mazo (puedes jugarla si coincide).",
          "Si tampoco puedes, pasas.",
        ],
      },
      {
        icon: "⚡",
        heading: "Figuras y efectos",
        bullets: [
          "Sota: el siguiente jugador pierde su turno.",
          "Caballo: se invierte el sentido de la ronda.",
          "Rey: el siguiente jugador roba 4 cartas y pierde su turno.",
          "As: el jugador elige el palo que debe seguir el descarte.",
          "7 del mismo palo que el descarte: el siguiente roba 2 cartas.",
        ],
      },
    ],
  },
  {
    id: "cinquillo",
    emoji: "🖐️",
    title: "El Cinquillo",
    tagline: "Construye escaleras a partir de los 5s — el primero en vaciar gana",
    players: "2-5",
    duration: "15-25 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Ser el primero en colocar todas tus cartas en las escaleras del centro.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten todas las cartas a partes iguales (pueden quedar cartas fuera si no dividen exacto).",
          "En el centro hay 4 posiciones de escalera, una por palo. Todas empiezan vacías.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno",
        bullets: [
          "Solo se puede iniciar una escalera con el 5 de ese palo.",
          "Una vez iniciada: se puede colocar el 4 o el 6 del mismo palo en los extremos.",
          "Las escaleras van de As (extremo bajo) a Rey (extremo alto).",
          "Si no tienes carta jugable, PASAS. Solo puedes colocar 1 carta por turno.",
        ],
      },
      {
        icon: "🏆",
        heading: "Final",
        bullets: [
          "El primero en colocar todas sus cartas gana.",
          "Variante competitiva: los demás cuentan sus cartas restantes (puntos negativos). El acumulado decide el ranking.",
        ],
      },
    ],
  },
  {
    id: "pocha",
    emoji: "🎯",
    title: "La Pocha",
    tagline: "Predice exactamente cuántas bazas ganarás cada ronda — ni una más, ni una menos",
    players: "3-6",
    duration: "30-60 min",
    difficulty: "Difícil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Acumular más puntos prediciendo con exactitud cuántas bazas ganarás en cada ronda.",
          "Se juegan rondas de 1 a N cartas (donde N = 40 ÷ nº jugadores) y vuelta a bajar.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación y triunfo",
        bullets: [
          "Se escogen 40 cartas y se retiran según jugadores para que el reparto sea limpio.",
          "Al repartir, la siguiente carta del mazo revela el palo de triunfo.",
          "Si es una figura → el triunfo lo elige el repartidor.",
        ],
      },
      {
        icon: "🗣️",
        heading: "Fase de apuestas",
        bullets: [
          "En sentido horario cada jugador declara cuántas bazas va a ganar (0 a N).",
          "El último en declarar NO puede elegir una cifra que haga que la suma de apuestas iguale el número de cartas repartidas.",
        ],
      },
      {
        icon: "🔄",
        heading: "Juego de bazas",
        bullets: [
          "Hay que seguir el palo si se puede. Sin ese palo, se puede matar con triunfo o fallar.",
          "Gana la baza el triunfo más alto o la carta de palo liderador más alta.",
        ],
      },
      {
        icon: "🏆",
        heading: "Puntuación",
        bullets: [
          "Acertar exactamente tu predicción: +10 + nº de bazas ganadas.",
          "Fallar: solo 1 punto por baza ganada, sin bonus.",
          "Acertar con 0 bazas: +10 puntos directos.",
        ],
      },
    ],
  },
  {
    id: "relojito",
    emoji: "⏱️",
    title: "El Relojito",
    tagline: "Di el número de tu carta antes de que alguien más lo diga — o roba",
    players: "3-8",
    duration: "10-20 min",
    difficulty: "Fácil",
    sections: [
      {
        icon: "🎯",
        heading: "Objetivo",
        bullets: [
          "Quedarte sin cartas siendo el más rápido en nombrar el número que se voltea.",
        ],
      },
      {
        icon: "🃏",
        heading: "Preparación",
        bullets: [
          "Se reparten todas las cartas a partes iguales boca abajo (mazo personal).",
          "El jugador inicial voltea la primera carta de su mazo al centro diciendo su número en voz alta.",
        ],
      },
      {
        icon: "🔄",
        heading: "Turno (voltear)",
        bullets: [
          "En sentido horario, cada jugador voltea la carta superior de su mazo personal al centro.",
          "Al mismo tiempo dice en voz alta el número de la carta volteada.",
          "Si el número coincide con el número de la carta que acaba de voltear el jugador anterior → ¡DUELO!",
        ],
      },
      {
        icon: "⚡",
        heading: "Duelo y penalización",
        bullets: [
          "DUELO: los dos implicados en la coincidencia deben tocar el montón central.",
          "El más lento recoge TODAS las cartas del montón central.",
          "Si alguien dice mal el número de su carta → recoge las cartas del montón.",
          "Gana el primero en vaciar su mazo personal.",
        ],
      },
    ],
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

const AVATARS = ["🦄", "🐙", "🦊", "🐲", "🦋", "🐸", "🦝", "🐼", "🦖", "🐺", "👻", "🤖"];

function extractErr(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export default function BarajaScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const router = useRouter();
  const { setSession } = useRoom();

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [joiningGame, setJoiningGame] = useState<Game | null>(null);
  const [lobbyMode, setLobbyMode] = useState<"create" | "join">("create");
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  const createMut = useCreateRoom();
  const joinMut = useJoinRoom();
  const busy = createMut.isPending || joinMut.isPending;

  async function handleCreate() {
    setLobbyError(null);
    if (!playerName.trim()) { setLobbyError("Pon tu nombre"); return; }
    try {
      const res = await createMut.mutateAsync({
        data: {
          name: playerName.trim(),
          packs: ["banco"],
          tags: [],
          avatar,
          pointLimit: 0,
          gameTimerMs: 0,
        },
      });
      await setSession({
        roomCode: res.room.code,
        playerId: res.playerId,
        name: playerName.trim(),
        avatar,
      });
      setJoiningGame(null);
      router.replace("/players");
    } catch (e) {
      setLobbyError(extractErr(e));
    }
  }

  async function handleJoin() {
    setLobbyError(null);
    if (!playerName.trim() || !roomCode.trim()) {
      setLobbyError("Necesitas nombre y código de sala");
      return;
    }
    try {
      const res = await joinMut.mutateAsync({
        code: roomCode.trim().toUpperCase(),
        data: { name: playerName.trim(), tags: [], avatar },
      });
      await setSession({
        roomCode: res.room.code,
        playerId: res.playerId,
        name: playerName.trim(),
        avatar,
      });
      setJoiningGame(null);
      router.replace(res.room.status === "active" ? "/game" : "/players");
    } catch (e) {
      setLobbyError(extractErr(e));
    }
  }

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

              <Pressable
                onPress={() => {
                  setJoiningGame(game);
                  setLobbyMode("create");
                  setLobbyError(null);
                  setRoomCode("");
                }}
                style={({ pressed }) => [
                  styles.playBtn,
                  {
                    borderColor: colors.primary,
                    backgroundColor: colors.primary + (pressed ? "44" : "22"),
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <Text style={[styles.playBtnText, { color: colors.primary }]}>
                  🎮  JUGAR
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* ── Rules modal ── */}
      <GameRulesModal
        game={selectedGame}
        onClose={() => setSelectedGame(null)}
      />

      {/* ── Lobby modal ── */}
      <Modal
        visible={!!joiningGame}
        transparent
        animationType="slide"
        onRequestClose={() => setJoiningGame(null)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "#00000090" }]}>
          <TouchableWithoutFeedback onPress={() => setJoiningGame(null)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.lobbyPanel,
              {
                backgroundColor: colors.background,
                borderColor: colors.primary,
                paddingBottom: (insets.bottom || 20) + 16,
              },
            ]}
          >
            {/* handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            {/* title */}
            <View style={styles.lobbyHeader}>
              <Text style={styles.lobbyEmoji}>{joiningGame?.emoji ?? "🎮"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.lobbyTitle, { color: colors.primary }]}>
                  {joiningGame?.title}
                </Text>
                <Text style={[styles.lobbySubtitle, { color: colors.mutedForeground }]}>
                  Sala multijugador en tiempo real
                </Text>
              </View>
              <Pressable onPress={() => setJoiningGame(null)} style={[styles.modalClose, { borderColor: colors.border }]}>
                <Text style={{ color: colors.mutedForeground, fontFamily: "Inter_700Bold", fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>

            {/* tabs */}
            <View style={[styles.tabs, { borderColor: colors.border }]}>
              {(["create", "join"] as const).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => { setLobbyMode(m); setLobbyError(null); }}
                  style={[
                    styles.tab,
                    lobbyMode === m && { backgroundColor: colors.primary + "33", borderBottomColor: colors.primary, borderBottomWidth: 2 },
                  ]}
                >
                  <Text style={[styles.tabText, { color: lobbyMode === m ? colors.primary : colors.mutedForeground }]}>
                    {m === "create" ? "🆕 Crear Sala" : "🔗 Unirse"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
              {/* name */}
              <View style={{ gap: 6 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Tu nombre</Text>
                <TextInput
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder="Cómo te llamas…"
                  placeholderTextColor={colors.mutedForeground}
                  maxLength={20}
                  style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                />
              </View>

              {/* code (join only) */}
              {lobbyMode === "join" && (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Código de sala</Text>
                  <TextInput
                    value={roomCode}
                    onChangeText={setRoomCode}
                    placeholder="ABCD12"
                    placeholderTextColor={colors.mutedForeground}
                    maxLength={8}
                    autoCapitalize="characters"
                    style={[styles.input, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card }]}
                  />
                </View>
              )}

              {/* avatar */}
              <View style={{ gap: 8 }}>
                <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Avatar</Text>
                <View style={styles.avatarRow}>
                  {AVATARS.map((a) => (
                    <Pressable
                      key={a}
                      onPress={() => setAvatar(a)}
                      style={[
                        styles.avatarBtn,
                        {
                          borderColor: avatar === a ? colors.primary : colors.border,
                          backgroundColor: avatar === a ? colors.primary + "22" : colors.card,
                        },
                      ]}
                    >
                      <Text style={styles.avatarEmoji}>{a}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* error */}
              {lobbyError && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{lobbyError}</Text>
              )}

              {/* CTA */}
              <Pressable
                onPress={lobbyMode === "create" ? handleCreate : handleJoin}
                disabled={busy}
                style={[
                  styles.ctaBtn,
                  { borderColor: colors.primary, backgroundColor: colors.primary + "33",
                    shadowColor: colors.primary, opacity: busy ? 0.6 : 1 },
                ]}
              >
                {busy
                  ? <ActivityIndicator color={colors.primary} />
                  : <Text style={[styles.ctaBtnText, { color: colors.primary }]}>
                      {lobbyMode === "create" ? "🚀  CREAR SALA" : "🔗  UNIRSE A SALA"}
                    </Text>
                }
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  playBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  playBtnText: { fontFamily: "Inter_700Bold", fontSize: 13, letterSpacing: 1 },

  // chip
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  chipText: { fontFamily: "Inter_700Bold", fontSize: 11 },

  // modal shared
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

  // sections (rules modal)
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

  // lobby modal
  lobbyPanel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 2,
    borderBottomWidth: 0,
    maxHeight: "92%",
    paddingTop: 12,
  },
  lobbyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  lobbyEmoji: { fontSize: 32, lineHeight: 40 },
  lobbyTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  lobbySubtitle: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginHorizontal: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: { fontFamily: "Inter_700Bold", fontSize: 13 },

  inputLabel: { fontFamily: "Inter_500Medium", fontSize: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },

  avatarRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 22, lineHeight: 26, textAlign: "center" },

  errorText: { fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" },

  ctaBtn: {
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  ctaBtnText: { fontFamily: "Inter_700Bold", fontSize: 15, letterSpacing: 1.5 },
});
