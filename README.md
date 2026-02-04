# CMS – Clean Architecture (dominio unico)

Repository con **un unico dominio: il CMS**. Architettura Clean pura. **Form Generator** e **Chat** sono parti del dominio che possono essere **esternalizzate** e usate in modo indipendente; **dentro al CMS** vengono comunque usate (il CMS le integra).

## Struttura (Clean Architecture)

```
cms/
├── package.json
├── tsconfig.base.json
├── README.md
├── docs/
│   └── ARCHITECTURE.md
└── packages/
    ├── domain/           # Unico dominio: entità e port (CMS, form, chat)
    ├── application/      # Use cases del CMS (tutti: page, menu, form, chat)
    ├── infrastructure/  # Solo adattatori core CMS (page, menu, render)
    ├── form-generator/   # Esternalizzabile: use cases + adapters form; usato dal CMS
    ├── chat/             # Esternalizzabile: use cases + adapters chat; usato dal CMS
    └── cms/              # Composition root: applicazione + infra + form-generator + chat
```

## Regola delle dipendenze

- **domain** → nessuna dipendenza.
- **application** → solo `@cms/domain` (tutti i use case del CMS).
- **infrastructure** → solo `@cms/domain` (solo adattatori core: page, menu, render).
- **form-generator** → solo `@cms/domain`. Espone API standalone + classi adapter per iniezione nel CMS.
- **chat** → solo `@cms/domain`. Espone API standalone + classi adapter per iniezione nel CMS.
- **cms** → domain, application, infrastructure, form-generator, chat. Compone tutto e usa form e chat internamente.

## Esternalizzare Form Generator e Chat

- **@sherpadvisorylab/form-generator**: usabile da solo (`formBuilder.getFormStructure`, ecc.) o come implementazione dei port form del CMS.
- **@sherpadvisorylab/chat**: usabile da solo (`chat.sendMessage`, ecc.) o come implementazione dei port chat del CMS.
- **@sherpadvisorylab/cms**: usa form-generator e chat al suo interno e espone un’API unificata (getPage, getMenu, getFormStructure, sendMessage, ecc.).

## Build

```bash
npm install
npm run build
```

## Uso

**Solo CMS (form e chat inclusi):**
```ts
import { cms } from '@sherpadvisorylab/cms';

const { page } = await cms.getPage({ slug: 'privacy' });
const { structure } = await cms.getFormStructure({ formId: 'onboarding' });
const { messages } = await cms.listMessages({ conversationId: 'c1', limit: 50 });
```

**Solo Form Generator (standalone):**
```ts
import { formBuilder } from '@sherpadvisorylab/form-generator';
const { structure } = await formBuilder.getFormStructure({ formId: 'x' });
```

**Solo Chat (standalone):**
```ts
import { chat } from '@sherpadvisorylab/chat';
const { messages } = await chat.listMessages({ conversationId: 'c1', limit: 50 });
```

Vedi **docs/ARCHITECTURE.md** per i dettagli.
