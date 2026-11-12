import { createServerFn } from "@tanstack/react-start";
import Anthropic from "@anthropic-ai/sdk";

export type DraftItem = { name: string; sets: string; reps: string; weight: string };
export type DraftCircuit = {
  name: string;
  circuitType: "AMRAP" | "EMOM" | "TABATA" | "ASAP";
  exercises: { name: string; reps: string; weight: string }[];
  amrapMinutes?: number;
  emomIntervalSeconds?: number;
  emomRounds?: number;
  workSeconds?: number;
  restSeconds?: number;
  tabataRounds?: number;
};
export type SessionDraft = {
  athleteId: string;
  athleteName: string;
  date: string;
  name: string;
  minutes: number;
  items: DraftItem[];
  circuits: DraftCircuit[];
};
export type RecentSession = { id: string; athleteId: string; athleteName: string; name: string; date: string };
export type PlannerResult =
  | { type: "draft"; draft: SessionDraft }
  | { type: "clarify"; text: string }
  | { type: "open"; sessionId: string; athleteId: string; athleteName: string }
  | { type: "duplicate"; sessionId: string; athleteId: string; athleteName: string; sessionName: string }
  | { type: "delete"; sessionId: string; athleteName: string; sessionName: string }
  | { type: "move"; sessionId: string; newDate: string; athleteName: string; sessionName: string };

const PROPOSE_SESSION_TOOL: Anthropic.Tool = {
  name: "propose_session",
  description: "Propone un borrador de sesión de entrenamiento NUEVA para un atleta puntual. Llamalo solo cuando sepas para qué atleta es, tengas al menos un ejercicio o circuito, y el coach ya haya confirmado que eso es todo.",
  input_schema: {
    type: "object",
    properties: {
      athleteId: { type: "string", description: "El id exacto del atleta, de la lista provista." },
      athleteName: { type: "string" },
      date: { type: "string", description: "Fecha en formato YYYY-MM-DD." },
      name: { type: "string", description: "Nombre corto de la sesión, ej: 'Tren inferior — Martes'." },
      minutes: { type: "number", description: "Duración estimada en minutos." },
      items: {
        type: "array",
        description: "Ejercicios sueltos de fuerza (sets/reps/peso). NO uses esto para AMRAP/EMOM/TABATA/ASAP — eso va en `circuits`.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre del ejercicio, preferentemente de la lista provista." },
            sets: { type: "string" },
            reps: { type: "string" },
            weight: { type: "string", description: "Peso sugerido, puede quedar vacío si no se especificó." },
          },
          required: ["name", "sets", "reps"],
        },
      },
      circuits: {
        type: "array",
        description: "Usá esto SIEMPRE que el coach pida un AMRAP, EMOM, TABATA o ASAP — nunca los representes como ejercicios sueltos con unidades inventadas.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Nombre del circuito, ej: 'AMRAP piernas'." },
            circuitType: { type: "string", enum: ["AMRAP", "EMOM", "TABATA", "ASAP"] },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  reps: { type: "string", description: "Solo la cantidad (reps, metros, calorías, etc.) — el peso NUNCA va acá, va en `weight`." },
                  weight: { type: "string", description: "Peso con su unidad, ej: '20kg' o '45lb'. Vacío si no se especificó." },
                },
                required: ["name", "reps"],
              },
            },
            amrapMinutes: { type: "number", description: "Solo si circuitType=AMRAP: duración total en minutos." },
            emomIntervalSeconds: { type: "number", description: "Solo si circuitType=EMOM: segundos por intervalo (normalmente 60)." },
            emomRounds: { type: "number", description: "Solo si circuitType=EMOM: cantidad de rondas." },
            workSeconds: { type: "number", description: "Solo si circuitType=TABATA: segundos de trabajo (normalmente 20)." },
            restSeconds: { type: "number", description: "Solo si circuitType=TABATA: segundos de descanso (normalmente 10)." },
            tabataRounds: { type: "number", description: "Solo si circuitType=TABATA: cantidad de rondas (normalmente 8)." },
          },
          required: ["name", "circuitType", "exercises"],
        },
      },
    },
    required: ["athleteId", "athleteName", "date", "name"],
  },
};

const OPEN_SESSION_TOOL: Anthropic.Tool = {
  name: "open_session",
  description: "Abre (para editar en pantalla) una sesión que YA EXISTE, de la lista de sesiones recientes provista.",
  input_schema: {
    type: "object",
    properties: {
      sessionId: { type: "string", description: "El id exacto de la sesión, de la lista de sesiones recientes." },
      athleteId: { type: "string" },
      athleteName: { type: "string" },
    },
    required: ["sessionId", "athleteId", "athleteName"],
  },
};

const DUPLICATE_SESSION_TOOL: Anthropic.Tool = {
  name: "duplicate_session",
  description: "Duplica (copia/repite) una sesión que ya existe, de la lista de sesiones recientes.",
  input_schema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      athleteId: { type: "string" },
      athleteName: { type: "string" },
      sessionName: { type: "string" },
    },
    required: ["sessionId", "athleteId", "athleteName", "sessionName"],
  },
};

const DELETE_SESSION_TOOL: Anthropic.Tool = {
  name: "delete_session",
  description: "Borra una sesión que ya existe. SOLO llamalo después de que el coach confirmó explícitamente que quiere borrarla (preguntale primero en texto plano si no lo confirmó todavía).",
  input_schema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      athleteName: { type: "string" },
      sessionName: { type: "string" },
    },
    required: ["sessionId", "athleteName", "sessionName"],
  },
};

const MOVE_SESSION_TOOL: Anthropic.Tool = {
  name: "move_session",
  description: "Mueve (cambia la fecha de) una sesión que ya existe.",
  input_schema: {
    type: "object",
    properties: {
      sessionId: { type: "string" },
      newDate: { type: "string", description: "Nueva fecha en formato YYYY-MM-DD." },
      athleteName: { type: "string" },
      sessionName: { type: "string" },
    },
    required: ["sessionId", "newDate", "athleteName", "sessionName"],
  },
};

export type PlannerMessage = { role: "user" | "assistant"; content: string };

export const draftSessionWithToguito = createServerFn({ method: "POST" })
  .validator((data: { messages: PlannerMessage[]; athletes: { id: string; name: string }[]; exerciseNames: string[]; recentSessions: RecentSession[] }) => data)
  .handler(async ({ data }): Promise<PlannerResult> => {
    const apiKey = process.env["ANTHROPIC_API_KEY"];
    if (!apiKey) return { type: "clarify", text: "Toguito todavía no está conectado (falta configurar la API key)." };

    const today = new Date().toISOString().slice(0, 10);
    const athletesList = data.athletes.map((a) => `- ${a.name} (id: ${a.id})`).join("\n");
    const exercisesList = data.exerciseNames.slice(0, 150).join(", ");
    const sessionsList = data.recentSessions
      .map((s) => `- "${s.name}" de ${s.athleteName}, ${s.date} (sessionId: ${s.id}, athleteId: ${s.athleteId})`)
      .join("\n");

    const system = `Sos Toguito, el lobo asistente de TOGO. Un coach te está dictando por voz. Hoy es ${today}.

Atletas del coach (elegí uno por id exacto, nunca inventes un id):
${athletesList || "(el coach no tiene atletas cargados todavía)"}

Ejercicios conocidos en su biblioteca (preferí estos nombres si coinciden con lo que pidió, pero si menciona un ejercicio válido que no está en la lista también podés usarlo tal cual lo dijo):
${exercisesList || "(sin ejercicios cargados)"}

Sesiones recientes (últimos 14 días y próximos 14 días) que ya existen — usalas con open_session/duplicate_session/delete_session/move_session:
${sessionsList || "(no hay sesiones recientes cargadas)"}

Tenés estos modos, elegí el que corresponda al pedido:

0) RESPONDER una pregunta sobre el estado de un atleta (ej: "¿qué le falta a Juan esta semana?", "¿cuántas sesiones tiene María?", "¿qué hizo ayer?"): contestá directo en texto plano usando la lista de sesiones recientes de arriba — no llames a ninguna herramienta. Si la lista no alcanza para responder con certeza, decilo honestamente en vez de inventar.

1) CREAR una sesión nueva: si el pedido no deja claro para qué atleta es, o no tiene ningún ejercicio/circuito, respondé en texto plano haciendo UNA pregunta corta para aclararlo — no llames a ninguna herramienta todavía. No llames a propose_session apenas tengas el mínimo — el coach casi siempre va a querer agregar más. Antes de armar el borrador por primera vez en la conversación, preguntá en texto plano "¿algo más o armo la sesión así?". Solo llamá a propose_session cuando el coach ya confirmó que eso es todo (frases como "eso es todo", "listo", "dale", "armala", "nada más", "así está bien") o cuando pide un cambio después de ya haber visto un borrador. Si pide un AMRAP, EMOM, TABATA o ASAP, armalo SIEMPRE con el campo "circuits" — nunca como ejercicios sueltos. En cada ejercicio de un circuito, separá siempre cantidad y peso: "4 con 20 kg" es reps="4", weight="20kg" — el peso nunca va mezclado adentro de reps.

2) ABRIR (ver/editar en pantalla) una sesión que ya existe: buscala en la lista de sesiones recientes y llamá a open_session con su id exacto.

3) DUPLICAR / REPETIR una sesión que ya existe: llamá a duplicate_session con su id exacto.

4) BORRAR / ELIMINAR una sesión que ya existe: primero preguntá en texto plano "¿seguro que querés borrar '<nombre>' de <atleta>?" — solo llamá a delete_session después de que el coach confirme explícitamente (sí, dale, confirmado, borrala, etc.) en su siguiente mensaje.

5) MOVER / CAMBIAR DE DÍA una sesión que ya existe: llamá a move_session con su id exacto y la nueva fecha en formato YYYY-MM-DD.

Para 2-5: si hay más de una sesión reciente que podría ser la que el coach menciona, preguntá en texto plano cuál es antes de llamar a cualquier herramienta. Si no encontrás ninguna que coincida, decilo en texto plano — nunca inventes un id.

Tu respuesta en texto se lee en voz alta con texto-a-voz: nunca uses emojis ni símbolos decorativos, solo texto plano natural para hablar.`;

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system,
        tools: [PROPOSE_SESSION_TOOL, OPEN_SESSION_TOOL, DUPLICATE_SESSION_TOOL, DELETE_SESSION_TOOL, MOVE_SESSION_TOOL],
        messages: data.messages,
      });

      const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");

      if (toolUse?.name === "open_session") {
        const input = toolUse.input as Record<string, unknown>;
        return { type: "open", sessionId: String(input["sessionId"] ?? ""), athleteId: String(input["athleteId"] ?? ""), athleteName: String(input["athleteName"] ?? "") };
      }
      if (toolUse?.name === "duplicate_session") {
        const input = toolUse.input as Record<string, unknown>;
        return { type: "duplicate", sessionId: String(input["sessionId"] ?? ""), athleteId: String(input["athleteId"] ?? ""), athleteName: String(input["athleteName"] ?? ""), sessionName: String(input["sessionName"] ?? "") };
      }
      if (toolUse?.name === "delete_session") {
        const input = toolUse.input as Record<string, unknown>;
        return { type: "delete", sessionId: String(input["sessionId"] ?? ""), athleteName: String(input["athleteName"] ?? ""), sessionName: String(input["sessionName"] ?? "") };
      }
      if (toolUse?.name === "move_session") {
        const input = toolUse.input as Record<string, unknown>;
        return { type: "move", sessionId: String(input["sessionId"] ?? ""), newDate: String(input["newDate"] ?? today), athleteName: String(input["athleteName"] ?? ""), sessionName: String(input["sessionName"] ?? "") };
      }

      if (toolUse?.name === "propose_session") {
        const input = toolUse.input as Record<string, unknown>;
        return {
          type: "draft",
          draft: {
            athleteId: String(input["athleteId"] ?? ""),
            athleteName: String(input["athleteName"] ?? ""),
            date: String(input["date"] ?? today),
            name: String(input["name"] ?? "Sesión"),
            minutes: Number(input["minutes"] ?? 45) || 45,
            items: Array.isArray(input["items"])
              ? (input["items"] as Record<string, unknown>[]).map((it) => ({
                  name: String(it["name"] ?? ""),
                  sets: String(it["sets"] ?? ""),
                  reps: String(it["reps"] ?? ""),
                  weight: String(it["weight"] ?? ""),
                }))
              : [],
            circuits: Array.isArray(input["circuits"])
              ? (input["circuits"] as Record<string, unknown>[]).map((c) => ({
                  name: String(c["name"] ?? ""),
                  circuitType: (["AMRAP", "EMOM", "TABATA", "ASAP"].includes(String(c["circuitType"])) ? c["circuitType"] : "AMRAP") as DraftCircuit["circuitType"],
                  exercises: Array.isArray(c["exercises"])
                    ? (c["exercises"] as Record<string, unknown>[]).map((e) => ({ name: String(e["name"] ?? ""), reps: String(e["reps"] ?? ""), weight: String(e["weight"] ?? "") }))
                    : [],
                  ...(typeof c["amrapMinutes"] === "number" ? { amrapMinutes: c["amrapMinutes"] } : {}),
                  ...(typeof c["emomIntervalSeconds"] === "number" ? { emomIntervalSeconds: c["emomIntervalSeconds"] } : {}),
                  ...(typeof c["emomRounds"] === "number" ? { emomRounds: c["emomRounds"] } : {}),
                  ...(typeof c["workSeconds"] === "number" ? { workSeconds: c["workSeconds"] } : {}),
                  ...(typeof c["restSeconds"] === "number" ? { restSeconds: c["restSeconds"] } : {}),
                  ...(typeof c["tabataRounds"] === "number" ? { tabataRounds: c["tabataRounds"] } : {}),
                }))
              : [],
          },
        };
      }

      const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
      return { type: "clarify", text: textBlock?.text ?? "No entendí bien, ¿podés repetirlo con más detalle?" };
    } catch {
      return { type: "clarify", text: "Tuve un problema para procesar eso. Probá de nuevo." };
    }
  });
