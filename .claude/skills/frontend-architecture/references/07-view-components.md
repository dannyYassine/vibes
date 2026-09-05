# Component Taxonomy (View Layer Files)

**Scope:** everything nested below the top-level View (`06-view.md`). One screen = one Smart Container + zero or more Pass-Through Layouts + zero or more Leaf Inputs.

## Three component categories

### Smart Container

**What it is:** the top-level component per screen or major UI region (`UserFormView.vue`). The **only** component that calls `usePresenter(...)`.

**Rules:**
- Binds actions to Presenter methods, passes the VM (or sub-VM props) down, orchestrates child components.
- Subscribes to the feature's bus events happen in the Presenter (`onCreated`), not here — the Container just renders.

**Allowed imports:** Presenter token, ViewModel, framework adapter.

```vue
<!-- src/features/user/presentation/UserFormView.vue -->
<script setup lang="ts">
import { usePresenter } from "@/infra/presenter/vue/usePresenter";
import { UserFormPresenter } from "./UserFormPresenter";
import FormSectionWrapper from "./FormSectionWrapper.vue";
import ChildAddressInput from "./ChildAddressInput.vue";

const presenter = usePresenter(UserFormPresenter);
</script>

<template>
  <form @submit.prevent="presenter.handleSave()">
    <FormSectionWrapper title="Profile">
      <input v-model="presenter.vm.fullName" />
      <input v-model="presenter.vm.birthYear" />
    </FormSectionWrapper>
    <ChildAddressInput
      v-for="addr in presenter.vm.addresses"
      :key="addr.id"
      :vm="addr"
    />
  </form>
</template>
```

### Pass-Through Layout

**What it is:** a structural component (`FormSectionWrapper.vue`) — grids, cards, sections. Receives the VM (or VM props) and forwards them via props/slots.

**Rules:**
- NEVER inspects, mutates, or derives from VM content.
- Never imports Presenter, Service, or anything domain.
- If it starts caring about field names, it's becoming a Leaf Input or a Smart Container — refactor it into one.

**Allowed imports:** nothing structural-external; only child presentational components and the ViewModel *type* if needed for prop typing.

```vue
<!-- src/features/user/presentation/FormSectionWrapper.vue -->
<script setup lang="ts">
defineProps<{ title: string }>();
</script>

<template>
  <section class="card">
    <h3>{{ title }}</h3>
    <slot />
  </section>
</template>
```

### Leaf Input

**What it is:** an isolated control for one field or a small group (`ChildAddressInput.vue`).

**Rules:**
- Binds **directly to VM primitives** (`v-model="vm.city"`) when the VM is in scope via props.
- When it **can't reach the VM** (deeply nested, list item without drilling), emits a **targeted event carrying the item's unique ID** to the feature's EventBus.
- Never calls Services, never imports domain layers.

**Allowed imports:** ViewModel type (for prop typing), the feature's bus module, framework primitives.

```vue
<!-- src/features/user/presentation/ChildAddressInput.vue -->
<script setup lang="ts">
import type { AddressDraftViewModel } from "./AddressDraftViewModel";
import { userFormBus } from "./userFormBus";

defineProps<{ vm: AddressDraftViewModel }>();
</script>

<template>
  <div class="address-row">
    <input v-model="vm.city" />
    <button type="button" @click="userFormBus.emit('addressRemoved', { itemId: vm.id })">
      Remove
    </button>
  </div>
</template>
```

## EventBus

Typed pub-sub for deeply nested leaf components to reach the root Presenter without prop-drilling.

**Infrastructure:** `src/infra/events/EventBus.ts` — a small typed emitter (`on` / `off` / `emit`), generic over an event map.

**Per feature:** declare a typed channel:

```typescript
// src/features/user/presentation/userFormBus.ts
import { EventBus } from "@/infra/events/EventBus";

export type UserFormBusEvents = {
  addressRemoved: { itemId: string };
  addressMadePrimary: { itemId: string };
};
export const userFormBus = new EventBus<UserFormBusEvents>();
```

**Leaf emits:**

```typescript
userFormBus.emit("addressRemoved", { itemId });
```

**Root Presenter subscribes in `onCreated`, unsubscribes in `onDestroyed`:**

```typescript
override onCreated(): void {
  this.unsubRemoval = userFormBus.on("addressRemoved", ({ itemId }) => {
    this.removeAddress(itemId);
  });
}

override onDestroyed(): void {
  this.unsubRemoval?.();
}
```

**Bus rules:**
- Bus events carry **IDs, not whole objects**. The Presenter owns the data; the leaf only points at it.
- Buses are **feature-scoped module singletons** — one bus per feature, not a global event soup.
- The Presenter **always unsubscribes** in `onDestroyed`. Presenters are transient; a leaked subscription fires into a dead screen.
- Don't use the bus for **parent→child data** — that's props / `v-model`. The bus is child→root *intent* only.

## Global Store

**Path:** `src/features/<feature>/state/<Feature>Store.ts` — **optional**.

Holds Entities shared across views (e.g. the session user). Registered **singleton** in the container. Written by Services or Presenters after successful operations; read by Presenters/Views. **NOT a VM replacement** — VMs remain per-screen drafts; the Store is cross-view shared state.

Vue note: wrap in `reactive()` at construction so store reads are reactive in components.

```typescript
// src/features/user/state/UserStore.ts
import { reactive } from "vue";
import type { User } from "../domain/User";

export class UserStore {
  readonly current: User | null = null;

  static create(): UserStore {
    const store = reactive(new UserStore()) as UserStore;
    return store;
  }

  setCurrent(user: User): void {
    (this as { current: User | null }).current = user;
  }

  clear(): void {
    (this as { current: User | null }).current = null;
  }
}
```

## Decision table — which binding path to use

| Situation | Mechanism |
|---|---|
| Leaf owns a form field, VM in scope via props | `v-model` on VM primitive |
| Leaf is deeply nested; VM prop-drilling would cross 3+ levels | Bus event with item ID → root Presenter |
| Multiple leaves mutate one list item | Bus events per action (remove/primary/...) carrying itemId |
| Data needed by many unrelated views | Global Store |
| One-off display formatting | VM getter |
| Action with side effects (save/delete/fetch) | Presenter method (never bus, never store) |

## Anti-patterns

- **Logic creeping into Pass-Through Layouts.** A wrapper that checks `vm.isValid` to style itself is no longer pass-through — promote it or move the flag to a getter.
- **Leaves calling Services.** A leaf that fetches is a Smart Container in disguise — promote it and give it a Presenter.
- **Bus events without IDs.** Emitting whole objects duplicates state ownership; emit `{ itemId }` and let the Presenter resolve.
- **Storing VMs in the global Store.** Stores hold Entities; VMs are per-screen drafts and die with the screen.
- **Prop-drilling a VM through 4 levels** instead of using the bus. Past ~3 levels, emit an event with an ID.
