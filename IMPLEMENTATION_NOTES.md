# Implementation Notes

## 1. What I changed

### 1.1 Bug Fixes

- Fixed `computeDiff()` in `src/components/diff.util.ts` so line items are detected as changed when `description`, `quantity`, or `unitPrice` differs.
  `sku` is treated as the item identity rather than a field that determines whether the item changed.
- Fixed the approval permission check in `crDetailComponent`. Approve is now only enabled when the CR is `PENDING_APPROVAL` and the current user has one of the supported approval policies.

### 1.2 List

- Added loading, loaded, empty states.
- Added a status filter for all supported CR statuses.
- Added a seprate empty state when the selected filter has no matching requests.

### 1.3 Details

- Added loading and error states with Retry.
- Rendered the baseline/proposed line-item diff, totals, and delta.
- Sorted the audit timeline chronologically before rendering it.
- Added permission-aware Approve and Reject actions.
- Added rejection-reason validation, including whitespace-only input.
- Added submitted states to prevent duplicate actions and provide feedback while the API request is in progress.
- Added action error handling without replacing the currently displayed detail.

### 1.4 Interaction/state Synchronization

- Reload the detail when the selected CR ID changes.
- After a successful Approve or Reject, the detail emits a change event and the parent reloads the list so the updated status is reflected immediately.
- The application does not automatically select the first CR. Instead, it shows a prompt asking the user to select a request.
- When the acting user changes, the selected CR is cleared to avoid keeping a request selected that may not belong to the new user's organization.


---


## 2. Component & state model


- `AppComponent` acts as the container for the two main views. It owns the currently selected CR ID and the acting user.
- `CrListComponent` requests `CrSummary[]` from `CrApiService` and stores the result in `ViewState<CrSummary[]>`.
  - `loading` → API request is in progress.
  - `loaded` → requests were returned.
  - `empty` → the current user has no requests.
  - `error` → the API request failed.
- The mock `CrApiService` handles data access and organization scoping. The components consume the returned data and decide what the user is allowed to do.
- The template is driven by the component state:
  - `state.status` controls loading, error, empty, and loaded views.
  - `visibleRows` applied the selected list filter.
  - `diff` calculates the line-item changes.
  - `timeline` returns the audit entries in chronological order.
  - `canApprove` and `canReject` control action availability.
- Approve and Reject update the detail through the API. On success, `crDetailComponent` emits `changed`, and `AppComponent` reloads the list.


---


## 3. Invariants I keep

|Invariant | How / where |
| --- | --- |
| A user only sees CRs from their organization                           | `CrApiService.listChangeRequests()` filters summaries by `user.orgCode`. `getChangeRequest()` also checks the CR organization before returning its detail.                                                |
| Approve is only available for pending CRs                              | `CrDetailComponent.canApprove` checks `detail.status === 'PENDING_APPROVAL'`. the Approve button uses `[disabled]="!canApprove                                                                            |     | submitting"`. |
| Approve requires an approval policy                                    | `canApprove` calls `canApprovePolicy(session.user)`, which checks for `cr_a_u`, `cr_a_w`, or `cr_a_o`.                                                                                                    |
| Reject is only available for pending CRs and authorized users          | `canReject` checks the CR status and `canApprovePolicy(session.user)`. The Reject section is rendered with `*ngIf="canReject"`.                                                                           |
| A rejection reason must contain non-whitespace text                    | `rejectControl` uses `Validators.required` and `Validators.pattern(/\S/)`. The Reject button is disabled while the control is invalid, and `reject()` also validates the trimmed value before submitting. |
| Approve and Reject cannot be submitted more than once at the same time | `approve()` and `reject()` return early when `submitting` is true. The template also disables both buttons while `submitting`.                                                                            |
| The timeline is displayed chronologically                              | The `timeline` getter creates a copy of `audit` and sorts entries by `at` before the template renders them with `*ngFor`.                                                                                 |
| A failed action keeps the current detail visible                       | `approve()` and `reject()` only replace `state.data` after a successful API response. Errors are stored in `actionError` and displayed with `*ngIf`.                                                      |
| The list reflects a successful approval/rejection                      | `CrDetailComponent` emits `changed` after success. `AppComponent.onChangeRequestChanged()` calls `listComponent.load()`.                                                                                  |
| A previously selected CR is not kept when the acting user changes      | `AppComponent.switchUser()` sets `selectedId = null` before reloading the application view.                                                                                                               |
| The detail always corresponds to the selected CR                       | `CrDetailComponent.ngOnChanges()` calls `load()` whenever the `id` input changes.                                                                                                                         |

---

## 4. Testing strategy

- **Pure logic**: Tested the diff utility separately because it contains deterministic business logic that can be verified without rendering Angular components.
- **Component tests**: Tested timeline ordering, permission checks, rejection validation, approval/rejection actions, API failures, and loading behavior.
- **Rendered DOM tests**: Tested behavior that matters from the user's perspective, including:
  - Selecting a different CR updates the detail.
  - Status filtering changes the displayed rows.
  - Viewer and approver see different action states.
  - Reject remains disabled until a valid reason is entered.
  - Approve/Reject work through the rendered UI.
  - Errors are displayed when an action fails.
  - Buttons show a loading state and become disabled during slow requests.
  - The empty selection state is displayed when no CR is selected.
  - The selection is cleared when switching users.
- Used the mock API's `latencyMs` and `failNext` controls to test slow and failing requests.
- I focused on the acceptance criteria and important state transitions rather than testing framework behavior or implementation details that Angular itself guarantees.


---


## 5. Assumptions

- The provided permission model defines approval policies (`cr_a_u`, `cr_a_w`, `cr_a_o`) but does not define a separate Reject policy. Therefore I used the same approval policy for Reject.
- The mock API performs organization scoping but does not enforce the UI permission rules for Approve/Reject. The component therefore performs the permission checks before allowing those actions.
- I interpreted the timeline as a chronological history and display it oldest-first so the request's progression can be followed from creation to its latest action.
- I chose not to automatically select the first CR. This avoids showing an unnecessary `Not found` state when the acting user changes and makes the selection explicit.
- When switching users, I clear the selected CR because the previously selected request may not be visible or accessible for the new user's organization.
I kept the existing mock API behavior rather than adding API-level authorization or changing the provided fixture structure.


---


## 6. Where I used AI

- I used AI as a development assistant to understand the existing code, discuss implementation approaches, and help investigate test failures.
- I used it mainly for guidance and debugging rather than generating the entire solution.
- I reviewed the suggested changes, adapted them to the existing project structure, and verified the behavior by running the test suite after each implementation change.


---


## 7. What I'd improve with more time

- Improve accessibility and keyboard interaction, including focus management when selecting a CR and after an action completes.
- Add clearer success feedback after Approve or Reject.
- If this were connected to a real backend, move authorization checks to the API as well so permissions are enforced server-side rather than only by the UI.
- If the real permission model distinguishes approval and rejection permissions, use separate policies instead of sharing the approval policy.