# Mission 008G — source spec (verbatim from ChatGPT control room)

Captured 2026-10-01 from the "So sánh SWE2 Max Muse Spark" control room,
immediately after 008F final-clear + merge (main `e98a6e7a8e9017cb83fae4600fd160ef36084eb5`).

## Control-room analysis (design rationale, verbatim)

> Có. Tao đã nhìn lại code hiện tại trên main@e98a6e7. Điểm yếu nằm đúng ở
> deriveCorrectionEpisodes():
>
>     const repairChannelSurvives = (tasks ?? []).some(...)
>
> `tasks` ở đây là full task registry, trong khi thứ thực sự có thể được
> learner phục vụ lại bị giới hạn bởi mission.taskIds. Vì vậy một remediation
> task nằm ở mission khác có thể làm B1 tin rằng "vẫn còn đường repair",
> rồi reserve retrieval surface của mission hiện tại. Về lý thuyết có thể
> tạo dead-end giả.
>
> Tao sẽ sửa theo nguyên tắc quan trọng hơn: correction episode chỉ chứa
> evidence truth; khả năng repair được chứng minh ở policy/routing layer
> theo đúng mission hiện tại.
>
> Thiết kế mới
>
> Không đưa mission vào deriveCorrectionEpisodes(). Module đó tiếp tục chỉ
> trả lời: Learner đang có correction episode nào, thiếu function nào,
> surface nào đã burned, trạng thái episode là gì? Nó không được tự kết
> luận task nào còn serve được.
>
> Thêm một pure routing proof mới, ví dụ:
>
>     deriveMissionRepairPlan({
>       episode,
>       mission,
>       tasks,
>       candidates,
>       pendingDemands,
>       roles,
>       selection,
>       decisionContext
>     })
>
> Kết quả phải machine-readable:
>
>     {
>       episodeId,
>       missionId,
>       missionRevision,
>       capabilityId,
>       remainingFunctions: ["follow_short_direction"],
>       retestSurfaceIds: ["task.place.retrieval.follow_landmark"],
>       witnesses: {
>         follow_short_direction: [
>           {
>             candidateKind: "correction",
>             taskId: "task.place.remediation.follow",
>             taskRevision: 1,
>             purpose: "remediation",
>             missionMember: true,
>             coversFunction: true,
>             hardFilterClean: true,
>             consumesFreshRetestSurface: false
>           }
>         ]
>       },
>       complete: true,
>       reasonCode: "mission_repair_channel_proven"
>     }
>
> Invariant cần khóa:
>
>     REPAIRING / RELAPSED:
>       reserve fresh retest surfaces
>       IFF
>       for EVERY unresolved function
>       there exists at least one currently reachable,
>       mission-local, validator-clean repair route
>       that does not consume those fresh retest surfaces.
>
>     Không phải some(task). Phải là ∀ missingFunction ∃ reachable repair
>     witness.
>
> Đừng chỉ đổi tasks thành missionTasks
>
> Chỉ sửa `tasks.some(...)` thành `missionTasks.some(...)` vẫn chưa đủ.
> Ví dụ mission có:
>
>     task A = fresh retrieval retest
>     task B = remediation
>
> nhưng generateCandidates() hiện có thể chọn A làm refresh trước B vì
> task ordering. Nếu proof chỉ nhìn thấy "B tồn tại", nó sẽ reserve A.
> Nhưng candidate thực tế vẫn đang trỏ vào A → hard filter loại A →
> B không tự động được repick.
>
> Tức là: task tồn tại ≠ task reachable.
>
> Do đó extract logic servable()/pickTask() hiện nằm trong
> candidate-generator.js thành một shared deterministic resolver:
>
>     resolveMissionTaskOptions({
>       mission, tasks, capabilityId, purposes,
>       requiredFunctions, events, excludeTaskIds
>     })
>
> B0 gọi nó với excludeTaskIds = [] → behavior phải byte-identical.
> B1 proof gọi nó với excludeTaskIds = freshRetestSurfaceIds để hỏi:
> "Nếu giữ lại các fresh retest probes, policy còn một task hợp lệ nào
> để repair capability này không?" — đây mới là proof đúng.
>
> State semantics:
>
>     Episode state      Reservation rule
>     OPEN               Không reserve. Surface đầu tiên thành công có
>                        thể chính là repair.
>     REPAIRING          Chỉ reserve nếu mission-local repair proof
>                        complete=true.
>     RELAPSED           Tương tự REPAIRING; phải chứng minh re-repair
>                        path hiện tại.
>     REPAIRED_WAITING   Reserve fresh retest surfaces trực tiếp; repair
>                        đã xảy ra rồi, không cần chứng minh lại channel.
>     RETEST_DUE         Không reserve nữa; retest cần được serve.
>     VERIFIED           Không reservation.
>
> Repair witness được tính thế nào
>
> Một witness chỉ hợp lệ khi nó thỏa toàn bộ: task thuộc đúng
> mission.taskIds và revision hiện hành; capability đúng với episode;
> task thực sự exercise function còn thiếu; policy hiện tại có
> intent/candidate đưa tới nó; candidate qua hardFilter khi chưa áp
> reservation; nó không phải support task, transfer, assessment hay
> correction_retest; và việc dùng task đó không tiêu thụ một fresh
> retest surface đang muốn bảo vệ.
>
> Với implementation hiện tại, ưu tiên các route thật mà B1 đã có:
> CORRECTION, REFRESH. Không lấy SUPPORT_DEMAND làm repair witness, vì
> support success không repair target episode. Nếu sau này muốn cho một
> intent khác trở thành repair route thì phải mở contract có chủ ý,
> không để some(task) vô tình biến nó thành witness.
>
> Kiểm thử bắt buộc (bảng đầy đủ ở phần REQUIRED ATTACKS).
>
> Test mạnh nhất là metamorphic:
>
>     same learner state / same mission / same mission.taskIds /
>     same events
>     + add arbitrary out-of-mission repair tasks to global registry
>     => repair proof MUST remain byte-identical
>     => reservedTaskIds MUST remain identical
>     => B1 chosen decision MUST remain identical
>
> Nếu test này fail thì vẫn còn registry leakage.
>
> Với 3 path hiện tại:
>
>     meet_at_a_time / understand_clock_time
>       → task.time.remediation.hear  → PROVEN
>     buy_small_item / understand_spoken_price
>       → task.price.remediation.hear → PROVEN
>     find_a_place / follow_short_direction
>       → task.place.remediation.follow → PROVEN
>
> Nhưng proof phải dựa vào đúng mission@revision, không dựa vào việc các
> task đó tình cờ tồn tại đâu đó trong TASK_REGISTRY.
>
> Architecture:
>
>     Evidence truth
>     deriveCorrectionEpisodes()
>           ↓
>     Mission-local routing truth
>     deriveMissionRepairPlan()
>           ↓
>     B1 reservation
>     deriveRetestReservations()
>           ↓
>     hardFilter()
>           ↓
>     policyB1()

## MISSION 008G — MISSION-LOCAL REPAIR REACHABILITY PROOF

BASE
main @ e98a6e7a8e9017cb83fae4600fd160ef36084eb5

GOAL

Replace full-registry repair-channel assumptions with an explicit,
mission@revision + capability + missing-function reachability proof.

Do not change B0 behavior.
Do not roll out B1.

CORE INVARIANT

For REPAIRING / RELAPSED:

a fresh correction-retest surface may be reserved only if
EVERY unresolved function has at least one currently reachable,
mission-local, validator-clean repair path that does not consume
that fresh retest surface.

STRUCTURE

1. Keep deriveCorrectionEpisodes evidence-only.
2. Move retest reservation out of correction-episodes.js.
3. Extract/share deterministic mission task resolution instead of
   duplicating candidate-generator routing.
4. Support excludedTaskIds so B1 can ask:
   "what can repair this capability if I preserve these fresh probes?"
5. Produce a machine-readable repair proof bound to:
   missionId
   missionRevision
   episodeId
   capabilityId
   remainingFunctions
   witness task@revision
   candidate kind
   filter result.
6. Reserve only when proof is complete for every remaining function.

REQUIRED ATTACKS

- repair exists only in another mission;
- unrelated registry task added/removed;
- wrong capability;
- wrong requiredFunction;
- stale revision;
- repair bound exhausted;
- failure ceiling;
- primary refresh task is a reserved retest but later remediation exists;
- one of two missing functions lacks repair;
- relapse loses its old repair route;
- mission revision changes;
- no proof silently reserves a retest.

METAMORPHIC INVARIANT

Holding mission@revision + events + policy constant,
adding arbitrary out-of-mission tasks MUST NOT change:

- repair proof
- reserved retest ids
- B1 decision
- B1 reason code.

CURRENT REAL PATHS

clock-time
price
direction

must all retain a positive mission-local repair proof.

B0

1792 frozen corpus must remain behavior-identical.

PERFORMANCE

No second learner-model/projection replay.
No second full generateCandidates pass merely for proof.
Profile incremental overhead; no invented SLA.

FINAL REPORT

MISSION 008G — MISSION-LOCAL REPAIR REACHABILITY

BASE SHA
ENDING SHA
PR

OLD FAILURE MODE
PROOF CONTRACT
MISSION TASK RESOLVER
FUNCTION-LEVEL WITNESSES

CLOCK-TIME PROOF
PRICE PROOF
DIRECTION PROOF

CROSS-MISSION ATTACK
REGISTRY-INVARIANCE ATTACK
ALTERNATE-REPICK ATTACK
MULTI-FUNCTION ATTACK

B0 PARITY
B1 DIFFERENTIAL
PERFORMANCE

VERIFY:FULL
CI

WHAT IS NOW PROVEN
KNOWN LIMITATIONS

PR NOT MERGED — AWAITING CHATGPT POLICY REVIEW
