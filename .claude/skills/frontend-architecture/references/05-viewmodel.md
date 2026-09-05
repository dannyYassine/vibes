# Layer 5: ViewModel

**Path:** `src/features/user/presentation/UserFormViewModel.ts`

## Responsibility

The ViewModel is a **passive, stateful draft** — a scratchpad the View binds to with `v-model` and the Presenter mutates. It is not a projection of an Entity; it is the UI's own working memory.

It holds **flat, native TypeScript primitives** (`string`, `number`, `boolean`, `string | null`, plain arrays of primitives/ids). It never wraps domain entities, never holds Entity references. Derived UI logic lives in **pure getters** (`isSubmitDisabled`, `avatarInitials`) computed from its own primitives.

Because it is a plain class with only primitives and prototype getters, Vue's `reactive()` proxies it cleanly — field writes are tracked, getters stay computed. Loading/error flags live here (`isSaving`, `errorMessage`) — written by the Presenter, read by the View.

## Strict rules

- **Imports nothing.** Not even types from other layers. No side effects. No async.
- **Flat primitives only.** No nested domain objects, no Entity references. Arrays are fine when their elements are primitives/ids — or nested **draft VM instances** for repeated rows (e.g. address rows), each a VM obeying these same rules.
- **Pure getters for derived values.** Getters must not mutate.
- **Input state stays raw.** `birthYear: string` — conversion happens in the Presenter, not the VM.
- **The Presenter populates the VM field-by-field.** The VM never fetches, never computes from services.
- **One VM class per UI shape** — a form draft, a list item, and a detail panel get separate classes even when backed by the same Entity.

## Canonical example

```typescript
// src/features/user/presentation/UserFormViewModel.ts

export class UserFormViewModel {
  // --- Draft state (mutated by View via v-model, and by Presenter) ---
  id: string = "";
  fullName: string = "";
  birthYear: string = "";   // raw input — parsing is the Presenter's job
  isSaving: boolean = false;
  errorMessage: string | null = null;

  // --- Derived pure UI logic (getters only) ---
  get isSubmitDisabled(): boolean {
    return !this.fullName.trim() || !this.birthYear || this.isSaving;
  }

  get submitLabel(): string {
    return this.isSaving ? "Saving…" : "Save Profile";
  }
}
```

## Draft VMs vs. display VMs

Two shapes are valid. Both follow the same rules — flat primitives, pure getters, no Entity reference.

**1. Draft VM** (above): a form scratchpad, mutated via `v-model` + Presenter. Inputs stay raw strings; the Presenter parses on submit.

**2. Display VM**: the Presenter copies Entity fields into flat primitives after load, and getters derive display values from those copies.

```typescript
// src/features/user/presentation/UserDetailViewModel.ts

export class UserDetailViewModel {
  // --- Copied state (written once by the Presenter after load) ---
  id: string = "";
  displayName: string = "";
  email: string = "";
  roleLabel: string = "";
  /** Epoch milliseconds — Dates are stored as numbers (see note below). */
  lastLoginAt: number | null = null;
  canEditRole: boolean = false;
  /** Written by the Presenter ("Active", "Dormant", "Deactivated"). */
  statusText: string = "";

  // --- Derived pure UI logic (getters only) ---
  get avatarInitials(): string {
    return this.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
  }

  get formattedLastLogin(): string {
    if (this.lastLoginAt === null) return "Never";
    return this.formatRelative(new Date(this.lastLoginAt));
  }

  get statusLabel(): string {
    return this.statusText;
  }

  private formatRelative(date: Date): string {
    const diffDays = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }
}
```

**Dates rule:** store epoch-milliseconds `number`s (or ISO strings), never `Date` instances. Vue's `reactive()` proxy breaks `Date` methods (`proxyDate.getTime()` throws "this is not a Date"). A number is a primitive — reactive-safe by construction. The Presenter converts `Date → epoch` during the copy.

The old entity-wrapping pattern — `constructor(private readonly user: User)` with getters delegating to `this.user` — is **FORBIDDEN**. Copying is the point: a VM holding an Entity reference is (a) not reactive-safe, since `reactive()` tracks the VM's own fields but the Entity's writes bypass it, and (b) coupled to the domain shape, so a domain rename ripples into the View. Copy flat primitives; the Presenter owns the copying.

## What does NOT belong in a ViewModel

- **Service calls** — that's the Presenter.
- **Async work** — the VM is synchronous, always.
- **Imports** — the VM file imports nothing, including types.
- **Entity references** — copy primitives instead (see above).
- **Mutations from the View beyond `v-model` bindings** — the View writes input fields; everything else is Presenter territory.
- **Multi-entity policies** (`canPromote` based on actor + target) — that's the Service; the Presenter copies the answer into a boolean flag.

## Testing

ViewModel tests are pure unit tests — construct the VM, set primitives, assert getters:

```typescript
const vm = new UserFormViewModel();
expect(vm.isSubmitDisabled).toBe(true);

vm.fullName = "Ada Lovelace";
vm.birthYear = "1990";
expect(vm.isSubmitDisabled).toBe(false);

vm.isSaving = true;
expect(vm.isSubmitDisabled).toBe(true);
expect(vm.submitLabel).toBe("Saving…");
```

No mocks, no framework, no async. These are the fastest tests in the suite — 100% coverage is cheap and reasonable.
