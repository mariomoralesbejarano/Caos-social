import type { CardCategory, CardTag, GameCard, PackId } from "./types";

const C = (
  id: string,
  title: string,
  effect: string,
  power: string,
  category: CardCategory,
  points: number,
  opts: { blockedBy?: CardTag[]; isPower?: boolean; pack?: PackId } = {},
): GameCard => ({ id, title, effect, power, category, points, ...opts });

// PACK TARDEO / BAR (20)
const TARDEO: GameCard[] = [
  C("td-posavasos", "Torre de Posavasos", "Construye una torre de 5 posavasos en 30s.", "Si la mantienes 10s, doble puntos.", "fisico", 15, { pack: "tardeo" }),
  C("td-camarero", "Saluda al Camarero", "Llama al camarero por su nombre (pregúntalo si no lo sabes).", "Si te responde con simpatía, +10 extra.", "social", 15, { pack: "tardeo" }),
  C("td-tapa-ajena", "Tapa Ajena", "Pide una tapa de la mesa de al lado (con educación).", "Si te la dan, +30.", "social", 25, { pack: "tardeo" }),
  C("td-rapidez-cana", "Caña Express", "Termina tu caña antes que el de al lado termine la suya.", "Sin pausas para respirar.", "beber", 20, { blockedBy: ["abstemio"], pack: "tardeo" }),
  C("td-brindis", "Brindis Improvisado", "Levanta tu vaso y suelta un brindis épico de 3 frases.", "Si todos repiten, +15.", "social", 15, { pack: "tardeo" }),
  C("td-aceitunas", "Cazador de Aceitunas", "Cómete 5 aceitunas seguidas sin dejar hueso en el plato.", "Si fallas, otra ronda.", "reto", 10, { pack: "tardeo" }),
  C("td-piropo", "Piropo al Bar", "Dile un piropo a la decoración del bar (en alto).", "Si el camarero ríe, +20.", "social", 15, { pack: "tardeo" }),
  C("td-cuenta-mental", "La Cuenta", "Calcula mentalmente la cuenta del grupo. Si aciertas ±2€, ganas.", "Sin móvil.", "reto", 25, { pack: "tardeo" }),
  C("td-foto-pareja", "Foto con la Mascota", "Hazte una foto con la mascota o el cartel del bar.", "Súbela al grupo.", "social", 10, { pack: "tardeo" }),
  C("td-cambia-sitio", "Cambio de Trono", "Cambia tu sitio con otro jugador durante 5 minutos.", "Sin protestar.", "reto", 10, { pack: "tardeo" }),
  C("td-cancion-bar", "DJ del Bar", "Pide al camarero que cambie la música.", "Si lo hace, +25.", "social", 20, { pack: "tardeo" }),
  C("td-trago-largo", "Trago de Honor", "Bebe sin parar mientras el grupo cuenta hasta 5.", "Cuenta lenta vale doble.", "beber", 15, { blockedBy: ["abstemio"], pack: "tardeo" }),
  C("td-mejor-anecdota", "La Anécdota", "Cuenta tu peor borrachera en menos de 60 segundos.", "Si nadie te interrumpe, +15.", "social", 20, { pack: "tardeo" }),
  C("td-cuelga-camisa", "Sin Camisa", "Quítate una prenda visible (con criterio) por 2 minutos.", "Hardcore = doble.", "reto", 20, { pack: "tardeo" }),
  C("td-baile-silla", "Baile de Silla", "Baila sentado durante 30 segundos sin parar.", "Ritmo obligatorio.", "fisico", 10, { pack: "tardeo" }),
  C("td-acento", "Acento Forzado", "Habla con acento de otra región durante 5 minutos.", "Si te equivocas, bebe.", "social", 15, { pack: "tardeo" }),
  C("td-pago-ronda", "Ronda Sorpresa", "Invita a la siguiente ronda al jugador a tu izquierda.", "Si la rechaza, +20 a ti.", "social", 30, { pack: "tardeo" }),
  C("td-anuncio", "Spot Publicitario", "Inventa un anuncio de tu bebida en 30 segundos.", "Si convences, +20.", "social", 15, { pack: "tardeo" }),
  C("td-imitar-camarero", "Modo Camarero", "Imita al camarero hasta que el grupo lo identifique.", "Sin que él te oiga.", "social", 15, { pack: "tardeo" }),
  C("td-foto-grupal", "Foto Histórica", "Organiza una foto grupal en 60s.", "Pídesela a un desconocido.", "social", 10, { pack: "tardeo" }),
];

// PACK FERIA / ROMERÍA (20)
const FERIA: GameCard[] = [
  C("fr-sevillanas", "4 por Sevillanas", "Baila las 4 sevillanas con cualquier persona disponible.", "Sin parar entre coplas.", "social", 30, { pack: "feria" }),
  C("fr-rebujito", "Invita a Rebujito", "Invita a un rebujito a alguien fuera del grupo.", "Si bebe contigo, +20.", "beber", 25, { blockedBy: ["abstemio"], pack: "feria" }),
  C("fr-flamenca", "Encuentra una Flamenca", "Hazte foto con alguien vestido de flamenca o corto.", "Pide permiso siempre.", "social", 20, { pack: "feria" }),
  C("fr-copla", "Copla Improvisada", "Cántale una copla a tu vecino de mesa.", "Si la canta contigo, +25.", "social", 20, { pack: "feria" }),
  C("fr-ole", "¡OLÉ!", "Grita un OLÉ tan fuerte que se gire la caseta de al lado.", "Sin reírte.", "social", 15, { pack: "feria" }),
  C("fr-palmas", "Palmas con Compás", "Marca palmas por bulerías durante 30 segundos.", "Sin perder el compás.", "fisico", 15, { pack: "feria" }),
  C("fr-rebujito-uno", "Rebujito Express", "Pide y bebe un rebujito en menos de 90 segundos.", "Sin pajita.", "beber", 20, { blockedBy: ["abstemio"], pack: "feria" }),
  C("fr-cabalgata", "Caminata de Caseta", "Camina hasta la caseta más lejana y vuelve con una servilleta.", "Sin móvil para guiarte.", "fisico", 25, { pack: "feria" }),
  C("fr-sombrero", "Sombrero Cordobés", "Encuentra a alguien con sombrero y pídeselo prestado 30 segundos.", "Si lo consigues, +25.", "social", 20, { pack: "feria" }),
  C("fr-piropo-flamenca", "Piropo Flamenco", "Dile un piropo galante a alguien vestido de flamenca.", "Sin pasarte de la raya.", "ligar", 25, { blockedBy: ["pareja"], pack: "feria" }),
  C("fr-caballo", "Foto con el Caballo", "Hazte foto con un caballo o coche de caballos.", "Pídelo bien al jinete.", "social", 25, { pack: "feria" }),
  C("fr-tortilla", "La Tortilla Real", "Come un trozo de tortilla en menos de 10 segundos.", "Sin agua hasta el final.", "reto", 15, { pack: "feria" }),
  C("fr-invita-papelillos", "Lluvia de Papelillos", 'Lanza papelillos sobre el grupo gritando "¡Viva!".', "Recoge después.", "social", 10, { pack: "feria" }),
  C("fr-faralaes", "Faralaes en Acción", "Mueve los faralaes (o imita el gesto) durante una sevillana entera.", "Con feeling.", "fisico", 15, { pack: "feria" }),
  C("fr-cante", "Cante Hondo", "Suelta un quejío flamenco que dure 5 segundos.", "Sin reírte.", "social", 15, { pack: "feria" }),
  C("fr-grupo-feria", "Selfie con Grupo Ajeno", "Selfie con un grupo de la caseta de al lado.", "Pide permiso.", "social", 25, { pack: "feria" }),
  C("fr-baile-cruzado", "Sevillanas Cruzadas", "Baila una sevillana cruzando con cada jugador del grupo.", "Sin tropezar.", "fisico", 30, { pack: "feria" }),
  C("fr-romeria", "Caminito de la Romería", "Da 30 pasos cantando 'Camina, romero, camina'.", "En voz alta.", "social", 15, { pack: "feria" }),
  C("fr-canasta", "El Pescaíto", "Convence al de la mesa de al lado para compartir pescaíto.", "Si te invita, +35.", "social", 30, { pack: "feria" }),
  C("fr-mantilla", "Mantilla Improvisada", "Improvisa una mantilla con una servilleta y desfila 10 segundos.", "Con porte.", "social", 15, { pack: "feria" }),
];

// PACK FAMILIAR (20)
const FAMILIAR: GameCard[] = [
  C("fa-quien-conoce", "¿Quién Conoce a Quién?", "Responde quién conoce mejor al grupo: tú o tu vecino. Comprobad.", "Si aciertas más, +20.", "social", 20, { pack: "familiar" }),
  C("fa-mimica-pelicula", "Mímica de Película", "Mímica de una peli familiar. 60 segundos para que adivinen.", "Sin sonidos.", "social", 20, { pack: "familiar" }),
  C("fa-anecdota-infancia", "Anécdota de Infancia", "Cuenta una anécdota tuya de antes de los 10 años.", "Si todos ríen, +15.", "social", 15, { pack: "familiar" }),
  C("fa-cancion-cumple", "Cumpleaños Feliz", "Canta el Cumpleaños Feliz a alguien aleatorio del local.", "Sin avisar.", "social", 25, { pack: "familiar" }),
  C("fa-trabalenguas", "Trabalenguas Veloz", "Di 'Tres tristes tigres tragaban trigo' 3 veces sin fallar.", "Doble puntos si lo grabas.", "reto", 15, { pack: "familiar" }),
  C("fa-receta", "Receta Familiar", "Cuenta tu receta familiar favorita en 60 segundos.", "Si convences a probarla, +10.", "social", 10, { pack: "familiar" }),
  C("fa-abrazo", "Abrazo Colectivo", "Inicia un abrazo grupal de 10 segundos.", "Si todos se suman, +15.", "social", 15, { pack: "familiar" }),
  C("fa-quien-fue", "¿Quién Fue?", "Pregunta al grupo quién fue el más travieso de pequeño.", "El elegido cuenta una anécdota.", "social", 15, { pack: "familiar" }),
  C("fa-dibuja", "Dibuja al Grupo", "Dibuja al grupo en una servilleta en 60 segundos.", "Vota la mejor caricatura.", "reto", 20, { pack: "familiar" }),
  C("fa-baile-noventero", "Baile Noventero", "Pon una canción de los 90 y baila la coreografía original.", "Si alguien la sigue, +20.", "social", 20, { pack: "familiar" }),
  C("fa-historia-familiar", "Historia de los Mayores", "Imita a un familiar mayor contando una batallita.", "Con cariño.", "social", 15, { pack: "familiar" }),
  C("fa-adivina-edad", "Adivina la Edad", "Adivina la edad exacta de un jugador. ±2 años cuenta.", "Si aciertas, +25.", "reto", 20, { pack: "familiar" }),
  C("fa-poema", "Poema Express", "Inventa un poema corto con el nombre de un jugador.", "Tres versos mínimo.", "social", 20, { pack: "familiar" }),
  C("fa-recuerdo", "Mejor Recuerdo", "Cuenta el mejor recuerdo que tienes con alguien del grupo.", "Sin lágrimas.", "social", 15, { pack: "familiar" }),
  C("fa-cumplido", "Cumplido Sincero", "Hazle un cumplido sincero a cada jugador del grupo.", "Sin repetir adjetivos.", "social", 20, { pack: "familiar" }),
  C("fa-acertijo", "Acertijo Clásico", "Lanza un acertijo. Si nadie acierta en 60s, +20.", "Sin Google.", "reto", 20, { pack: "familiar" }),
  C("fa-mimica-animal", "Mímica Animal", "Imita un animal hasta que adivinen.", "Sonidos permitidos.", "social", 10, { pack: "familiar" }),
  C("fa-cuento", "Cuento Improvisado", "Cuenta un mini-cuento en 30 segundos con personajes del grupo.", "Final feliz obligatorio.", "social", 15, { pack: "familiar" }),
  C("fa-nudo", "Nudo Humano", "Organiza al grupo para que se desenreden de un nudo de manos.", "60 segundos máximo.", "fisico", 25, { pack: "familiar" }),
  C("fa-canta-himno", "Himno Familiar", "Canta una canción típica de tu familia.", "Si te acompañan, +15.", "social", 15, { pack: "familiar" }),
];

// PACK NOCHE / HARDCORE (20)
const NOCHE: GameCard[] = [
  C("no-bailar-desconocido", "Bailar con Desconocido", "Baila 30 segundos con alguien fuera del grupo.", "Si aceptan, +30.", "social", 30, { blockedBy: ["pareja"], pack: "noche" }),
  C("no-numero", "El Número", "Pide el número a alguien en menos de 2 minutos.", "Si lo consigues, +50.", "ligar", 50, { blockedBy: ["pareja"], pack: "noche" }),
  C("no-grita", "Grito de Guerra", "Grita el nombre de un jugador desde la pista de baile.", "Sin reírte.", "social", 20, { pack: "noche" }),
  C("no-shot-doble", "Doble Shot", "Bébete dos chupitos seguidos del mismo color.", "Si no haces mueca, +25.", "beber", 25, { blockedBy: ["abstemio"], pack: "noche" }),
  C("no-besito-aire", "Besito al Aire", "Lanza un beso al aire a cualquiera que pase por delante.", "Si te lo devuelven, +20.", "ligar", 15, { blockedBy: ["pareja"], pack: "noche" }),
  C("no-foto-disco", "Foto Bajo Luces", "Hazte una foto con la cabina del DJ de fondo.", "Bonus si saludas al DJ.", "social", 20, { pack: "noche" }),
  C("no-canta-grita", "Canta a Pleno Pulmón", "Canta el estribillo de la canción que está sonando.", "A pleno pulmón.", "social", 15, { pack: "noche" }),
  C("no-bebe-zigzag", "Camina Zigzag", "Camina haciendo zigzag entre 3 personas sin chocar.", "Con bebida en mano.", "fisico", 20, { pack: "noche" }),
  C("no-sin-luz", "Baila a Oscuras", "Baila con los ojos cerrados durante 60 segundos.", "Sin chocarte.", "fisico", 20, { pack: "noche" }),
  C("no-presenta", "Presentaciones Cruzadas", "Preséntale dos desconocidos entre sí.", "Si se quedan hablando, +30.", "social", 30, { blockedBy: ["pareja"], pack: "noche" }),
  C("no-shot-grupal", "Shot Grupal", "Elige 2 amigos y todos os tomáis un chupito.", "Tú pagas.", "beber", 20, { blockedBy: ["abstemio"], pack: "noche" }),
  C("no-canta-DJ", "Petición al DJ", "Pídele al DJ que pinche una canción.", "Si lo hace, +50.", "social", 35, { pack: "noche" }),
  C("no-bola-disco", "Foto bajo Bola", "Foto bajo la bola de discoteca con pose épica.", "Sin caerte.", "social", 15, { pack: "noche" }),
  C("no-pelo", "Cambio de Look", "Cambia tu peinado por uno radical durante 5 minutos.", "Hardcore vale el doble.", "reto", 20, { pack: "noche" }),
  C("no-monologo", "Monólogo Disco", "Sube a una silla y suelta un monólogo de 30s.", "Si aplauden, +30.", "social", 25, { pack: "noche" }),
  C("no-prenda", "Cambio de Prenda", "Intercambia una prenda con otro jugador durante una canción.", "Sin trampa.", "reto", 20, { pack: "noche" }),
  C("no-baile-pareja", "Pareja de Baile", "Encuentra una pareja de baile en menos de 60 segundos.", "Sin engaño.", "ligar", 30, { blockedBy: ["pareja"], pack: "noche" }),
  C("no-shot-misterioso", "Shot Misterioso", "El grupo elige tu próximo chupito a ciegas.", "Sin protestar.", "beber", 30, { blockedBy: ["abstemio"], pack: "noche" }),
  C("no-confesion-publica", "Confesión Nocturna", "Cuéntale al grupo algo que nunca habías contado (apto para todos).", "Sin secretos peligrosos.", "social", 25, { pack: "noche" }),
  C("no-baño-libre", "Misión al Baño", "Pregunta a 3 desconocidos dónde está el baño aunque ya lo sepas.", "Hazlo con cara seria.", "social", 15, { pack: "noche" }),
];

// PACK ESTRATÉGICO / PODERES (15)
const ESTRATEGICO: GameCard[] = [
  C("reversa", "Reversa", "Devuelve el reto al jugador que te lo lanzó.", "El emisor original cumple sin opción a rechazar.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("bloqueo", "Bloqueo", "Inmunidad temporal: nadie te puede lanzar cartas por 5 minutos.", "Activa un escudo neón sobre tu perfil.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("espejo", "Espejo", "Quien lanzó la carta debe cumplir el reto él mismo.", "Tú ganas los puntos sin hacer nada.", "poder", 10, { isPower: true, pack: "estrategico" }),
  C("robo-carta", "Robo de Mano", "Roba una carta aleatoria de la mano del emisor.", "Queda en tu mano.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("comodin", "Comodín de Pánico", "Anula automáticamente el siguiente reto que te lancen.", "Un solo uso por partida.", "poder", 10, { isPower: true, pack: "estrategico" }),
  C("silencio", "Cono de Silencio", "Nadie puede hablar durante 5 minutos. Quien hable, recibe castigo.", "El portador puede hablar.", "poder", 10, { isPower: true, pack: "estrategico" }),
  C("doble-puntos", "Doble Puntos", "Tu próximo reto cumplido vale el doble.", "Acumulable con multiplier.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("inversion", "Inversión", "Intercambia tu puntuación con la del último jugador del ranking.", "Solo en partida activa.", "poder", 15, { isPower: true, pack: "estrategico" }),
  C("ladron", "Ladrón Estratégico", "Roba 5 puntos a cualquier jugador.", "Sin opción a defenderse.", "poder", 10, { isPower: true, pack: "estrategico" }),
  C("escudo-grupal", "Escudo Grupal", "Concede inmunidad de 3 minutos a otro jugador.", "Útil para alianzas.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("amplificador", "Amplificador", "Multiplica por 3 los puntos del próximo reto que cumpla cualquiera.", "Aplica al primero que acepte.", "poder", 10, { isPower: true, pack: "estrategico" }),
  C("rerol", "Rerol de Mano", "Descarta toda tu mano y roba 5 cartas nuevas.", "Útil contra mala suerte.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("vuelta-tortilla", "Vuelta de Tortilla", "Invierte el ranking actual.", "El primero pasa a último.", "poder", 20, { isPower: true, pack: "estrategico" }),
  C("regalo", "Regalo Envenenado", "Pasa una carta de tu mano al jugador que elijas.", "Sin que pueda rechazarla.", "poder", 5, { isPower: true, pack: "estrategico" }),
  C("revelacion", "Revelación", "Mira la mano completa de un jugador.", "Sin que él lo sepa.", "poder", 5, { isPower: true, pack: "estrategico" }),
];

// LEGACY
const LEGACY: GameCard[] = [
  C("hidalgo", "Hidalgo", "El receptor debe beber un trago largo de su bebida.", "Si lo cumple, gana inmunidad por 1 turno.", "beber", 10, { blockedBy: ["abstemio"], pack: "clasico" }),
  C("pregunta-incomoda", "Pregunta Incómoda", "Hazle una pregunta personal. Debe responder con la verdad.", "Si miente y le pillan, x2 castigo.", "social", 15, { pack: "clasico" }),
  C("bailar-desconocido", "Bailar con Desconocido", "Baila 30 segundos con alguien que no conozca del lugar.", "Si lo logra, +25 extra.", "social", 30, { blockedBy: ["pareja"], pack: "clasico" }),
  C("burpees", "20 Burpees", "El receptor hace 20 burpees aquí y ahora.", "Sin pausa, doble puntos.", "fisico", 20, { pack: "gimnasio" }),
  C("shot-grupal", "Shot Grupal", "Elige a 2 amigos y todos beben un chupito.", "Gana puntos por cada uno que acepte.", "beber", 15, { blockedBy: ["abstemio"], pack: "clasico" }),
  C("confesion", "Confesión Pública", "Confiesa algo vergonzoso (no peligroso) frente al grupo.", "Si todos ríen, +5.", "social", 20, { pack: "clasico" }),
  C("ligoteo", "Modo Galán", "Pídele el número a alguien en menos de 2 minutos.", "Si lo consigue, +50.", "ligar", 50, { blockedBy: ["pareja"], pack: "clasico" }),
  C("plancha", "Plancha 60s", "Mantén una plancha durante 60 segundos.", "El que aguante más, +10.", "fisico", 15, { pack: "gimnasio" }),
  C("imitacion", "Imitación", "Imita a otro jugador hasta que el grupo adivine.", "Si nadie adivina en 30s, doble puntos.", "social", 15, { pack: "clasico" }),
  C("karaoke", "Karaoke Express", "Canta el estribillo de la última canción que sonó.", "Si lo borda, +20.", "social", 20, { pack: "clasico" }),
  C("sentadillas", "30 Sentadillas", "Hazlas sin parar, ahora mismo.", "Doble puntos con peso extra.", "fisico", 20, { pack: "gimnasio" }),
  C("shot-mezcla", "Shot Misterioso", "El grupo mezcla 3 ingredientes seguros y lo bebes.", "Si no haces mueca, +25.", "beber", 25, { blockedBy: ["abstemio"], pack: "clasico" }),
];

export const ALL_CARDS: GameCard[] = [
  ...TARDEO, ...FERIA, ...FAMILIAR, ...NOCHE, ...ESTRATEGICO, ...LEGACY,
];

const idsOf = (arr: GameCard[]) => arr.map((c) => c.id);

export const PACKS: { id: PackId; cardIds: string[] }[] = [
  { id: "tardeo", cardIds: [...idsOf(TARDEO), ...idsOf(ESTRATEGICO).slice(0, 5)] },
  { id: "feria", cardIds: [...idsOf(FERIA), ...idsOf(ESTRATEGICO).slice(0, 5)] },
  { id: "familiar", cardIds: [...idsOf(FAMILIAR), ...idsOf(ESTRATEGICO).slice(5, 9)] },
  { id: "noche", cardIds: [...idsOf(NOCHE), ...idsOf(ESTRATEGICO)] },
  { id: "estrategico", cardIds: idsOf(ESTRATEGICO) },
  { id: "clasico", cardIds: [...idsOf(LEGACY), "reversa", "bloqueo", "espejo", "robo-carta", "comodin"] },
  { id: "discoteca", cardIds: [...idsOf(NOCHE).slice(0, 12), "reversa", "bloqueo", "espejo"] },
  { id: "cena", cardIds: [...idsOf(FAMILIAR).slice(0, 12), "reversa", "bloqueo", "espejo"] },
  { id: "gimnasio", cardIds: ["burpees", "plancha", "sentadillas", "imitacion", "reversa", "bloqueo", "espejo", "robo-carta"] },
  { id: "allin", cardIds: ALL_CARDS.map((c) => c.id) },
];

export function getCard(id: string, customCards: GameCard[] = []): GameCard | undefined {
  return ALL_CARDS.find((c) => c.id === id) ?? customCards.find((c) => c.id === id);
}

export function getPackCardIds(pack: PackId): string[] {
  return PACKS.find((p) => p.id === pack)?.cardIds ?? [];
}
