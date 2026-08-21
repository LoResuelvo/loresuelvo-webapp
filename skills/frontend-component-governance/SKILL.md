---
name: frontend-component-governance
description: "Gobernanza de Diseño y Composición de Componentes React: límites de tamaño (50-80 líneas), erradicación de prop drilling e interfaces gigantes mediante Composición con Slots, Single Level of Abstraction (SLA), Parameter Objects y organización de carpetas por sub-dominios. Usar al crear, refactorizar o evaluar componentes en components/ o app/."
---

# Frontend Component Governance (Composición, SLA y Vistas Delgadas)

Esta skill define las reglas de arquitectura y diseño limpio para componentes React en `loresuelvo-webapp`, garantizando **vistas auto-documentadas, componentes delgados, bajo acoplamiento y ausencia de interfaces gigantes**.

---

## 1. Principios Fundamentales de Diseño de Vistas

1. **Vistas Delgadas (_Thin Views / Dumb Components_)**: Los componentes React solo se encargan de **cómo se ve la UI** y de capturar eventos del usuario. No calculan reglas de negocio, no formatean moneda/fechas a mano y no manipulan directamente la física del DOM.
2. **Single Level of Abstraction (SLA)**: Cada componente u hook opera en un único nivel de detalle conceptual.
3. **Composición sobre Herencia / Prop Drilling**: Utilizar slots (`children`, `sidebar`, `chat`, etc.) para estructurar layouts en vez de pasar 20 props hacia abajo a través de intermediarios.

---

## 2. Regla de Tamaño Máximo de Componentes (50 a 80 Líneas)

- **Límite Estricto**: Ningún componente de negocio en `components/` debe superar las **50 a 80 líneas** de código.
- **Anti-patrón Prohibido ("Componente Dios / Monolito")**: Archivos de más de 100-300 líneas con múltiples formularios, modales hijos y manipulación de DOM dentro del JSX.
- **Solución Obligatoria**: Descomponer en un componente orquestador delgado (30-50 líneas) y sub-componentes especializados (30-40 líneas cada uno).

---

## 3. Erradicación de Interfaces Gigantes y Prop Drilling

### A. Límite de Props

- Una interfaz de props de un componente **no debe superar los 5 a 7 props**.
- Si un componente supera este límite, es síntoma de _Middle Man_ (pasamanos) o _Data Clumps_ (grupo de datos inconexos).

### B. Solución 1: Composición con Slots (Inversión de Control - IoC)

Para componentes de layout, paneles divididos o contenedores, pasar los elementos ya configurados mediante **Named Slots**:

```tsx
// PROHIBIDO: 22 props pasamanos en un componente intermedio
interface MessagesViewProps {
  contacts: Contact[];
  selectedContact: Contact | null;
  messages: Message[];
  messageInput: string;
  onSendMessage: () => void;
  attachedFiles: File[];
  onAttachFiles: (f: File[]) => void;
  // ... 15 props más
}

// OBLIGATORIO: Layout con Slots (3 props limpios)
interface MessagesSplitLayoutProps {
  sidebar: React.ReactNode;
  chat: React.ReactNode;
  isChatActive: boolean;
  className?: string;
}

export function MessagesSplitLayout({
  sidebar,
  chat,
  isChatActive,
  className,
}: MessagesSplitLayoutProps) {
  return (
    <main className={cn("flex-1 flex min-h-0", className)}>
      <div
        className={isChatActive ? "hidden md:flex" : "flex w-full md:w-auto"}
      >
        {sidebar}
      </div>
      <div
        className={
          isChatActive ? "flex flex-1 min-w-0" : "hidden md:flex flex-1 min-w-0"
        }
      >
        {chat}
      </div>
    </main>
  );
}
```

### C. Solución 2: Parameter Objects (Agrupación Cohesiva)

Cuando un sub-componente requiere datos y callbacks fuertemente relacionados, agruparlos en un objeto cohesivo:

```ts
// Parameter Object cohesivo
export interface MessageComposer {
  text: string;
  setText: (value: string) => void;
  send: () => void;
  isSending: boolean;
  files: File[];
  attach: (files: File[]) => void;
  removeFile: (index: number) => void;
}
```

---

## 4. Single Level of Abstraction (SLA) en Componentes

| Nivel de Detalle                    | Dónde Debe Vivir                                                           | Qué Está Prohibido en Componentes JSX                                                                                      |
| :---------------------------------- | :------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------- |
| **Física de DOM / Resize / Scroll** | **Custom Hooks dedicados** (`useAutoResizeTextarea`, `useSmartScroll`)     | Manipular `textarea.scrollHeight`, `ref.style.height` o `window.addEventListener` dentro del cuerpo del componente visual. |
| **Red, Polling y Parsing HTTP**     | **Server Actions / Use Cases / Hooks** (`usePaymentPolling`, `actions.ts`) | Evaluar `err.status === 409` o `message.includes("Ya existe")` dentro del JSX.                                             |
| **Reglas de Negocio y Formateos**   | **Módulos de Dominio** (`Money`, `ScheduledDateTime`, `ServiceProposal`)   | Formatear dinero con `$`, comparar fechas ISO con `new Date()` o calcular si se puede aceptar una propuesta.               |
| **Presentación y Layout**           | **Componente React / JSX**                                                 | Solo orquestar hooks, aplicar estilos Tailwind y renderizar etiquetas semánticas.                                          |

---

## 5. Prohibición de "Modales Matrioska" (Modales Anidados)

- **Regla**: Un modal **NUNCA** debe importar y renderizar otro modal dentro de su propio JSX.
- **Por qué es dañino**: Dificulta el seguimiento de foco, accesibilidad (a11y), z-index y vuelve el flujo de pantallas confuso.
- **Solución**: Los modales deben ser **hermanos** gestionados a nivel de la pantalla o página orquestadora.

---

## 6. Organización de Carpetas por Jerarquía y Sub-dominio

- **Regla**: Prohibido tener listas planas de más de 7 archivos sueltos en una misma carpeta.
- **Estructura Requerida**: Agrupar por sub-contextos funcionales:

```text
components/messaging/
├── chat/              # ChatHeader, ChatPanel, MessageBubble, MessageInput, MessagesList
├── proposals/         # ProposalCard, ProposalTimelineCard, ServiceProposalModal
├── contacts/          # ContactItem, ContactList, ContactsSidebar
└── layout/            # MessagesSplitLayout
```

---

## 7. Checklist de Calidad para Componentes

1. ¿El archivo tiene **menos de 80 líneas**?
2. ¿La interfaz tiene **menos de 7 props**?
3. ¿Está libre de manipulaciones directas de DOM/CSS (usando hooks si aplica)?
4. ¿Está libre de comparaciones de cadenas o cálculos de negocio (delegando en `domain/`)?
5. ¿El componente está agrupado en su sub-carpeta temática correspondiente?
