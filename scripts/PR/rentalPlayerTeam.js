


//auto team building, lets you build teams based on weights
// by gwenillia
//changes made by duck are marked with PR-EDIT






(function () {
  const SLOT_COUNT = 6;
  const MOVE_SLOTS = 4;
  const IV_KEYS = ["hp", "atk", "def", "satk", "sdef", "spe"];
  const SLOT_FIELDS = {
    id: 0,
    level: 1,
    shiny: 2,
    ability: 3,
    item: 4,
    moves: 5,
    ivs: 6
  };

  const rentalState = {
    active: false,
    restorePending: false,
    snapshot: null,
    pkmnSnapshots: {},
    lastLoss: false
  };

  function todayStamp() {
    return new Date().toISOString().split("T")[0];
  }

  function rentalUsedToday() {
    return saved.rentalLastUsedDate === todayStamp();
  }

  function getAreaId() {
    return saved.currentArea ?? saved.lastAreaJoined;
  }

  function getArea() {
    const areaId = getAreaId();
    return areaId ? areas[areaId] : undefined;
  }

  function isTrainingArea(area) {
    return area && areas.training && area.id === areas.training.id;
  }

  function isEligibleArea(area) {
    return !!area && !isTrainingArea(area) && area.type === "vs";
  }

  function isTeamDefeated() {
    for (const slot in team) {
      const slotPkmn = team[slot]?.pkmn;
      if (!slotPkmn) continue;
      const playerHp = pkmn[slotPkmn.id]?.playerHp;
      if (playerHp > 0) return false;
    }
    return true;
  }

  function getDefeatTracker() {
    if (!saved.rentalDefeatTracker) {
      saved.rentalDefeatTracker = { areaId: undefined, count: 0 };
    }
    return saved.rentalDefeatTracker;
  }

  function resetLossTracker(reason) {
    const tracker = getDefeatTracker();
    tracker.count = 0;
    tracker.areaId = undefined;
    console.log(`[Rental] Loss streak reset${reason ? ` (${reason})` : ""}`);
  }

  function updateDefeatTracker(loss) {
    const tracker = getDefeatTracker();
    const areaId = getAreaId();

    if (loss) {
      tracker.count = tracker.areaId === areaId ? tracker.count + 1 : 1;
      tracker.areaId = areaId;
      console.log(`[Rental] Loss streak ${tracker.count} in ${areaId}`);
    } else {
      resetLossTracker();
      tracker.areaId = areaId;
    }

    return tracker.count;
  }

  function shouldShowRentalButton(lossCount, area) {
    if (!isEligibleArea(area)) return false;
    if (rentalUsedToday()) return false;
    if (rentalState.active || rentalState.restorePending) return false;
    return rentalState.lastLoss && lossCount >= 3;
  }

  function logRentalStatus(lossCount, area) {
    console.log("[Rental] Button check", {
      lossCount,
      areaId: getAreaId(),
      eligible: isEligibleArea(area),
      lastLoss: rentalState.lastLoss,
      usedToday: rentalUsedToday(),
      active: rentalState.active,
      restorePending: rentalState.restorePending
    });
  }

  function removeRentalButton() {
    const existing = document.getElementById("area-rental");
    if (existing) existing.remove();
  }

  function showRentalButton(lossCount) {
    const area = getArea();
    removeRentalButton();
    logRentalStatus(lossCount, area);

    if (!shouldShowRentalButton(lossCount, area)) return;

    const refightButton = document.getElementById("area-refight");
    if (!refightButton) {
      console.log("[Rental] Missing #area-refight element");
      return;
    }

    const button = document.createElement("div");
    button.id = "area-rental";
    button.style.width = "95%";
    button.style.background = "rgb(118, 121, 196)";
    button.style.border = "2px solid rgb(151, 161, 255)";
    button.style.color = "white";
    button.style.display = "flex";
    button.style.justifyContent = "center";
    button.style.alignItems = "center";
    button.style.fontSize = "1.5rem";
    button.style.cursor = "pointer";
    button.style.marginTop = "1rem";
    button.style.borderRadius = "0.3rem";
    button.style.transition = "0.1s";
    button.innerHTML = `
      <svg style="margin-right:0.3rem" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M5 3h10a2 2 0 0 1 2 2v2h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2v-2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m2 4h10V5H5v10h2zm2 2v10h10V9z"/></svg>
      Rental Code (1/day)
    `;

    button.addEventListener("click", () => {
      openRentalTooltip();
    });

    refightButton.insertAdjacentElement("afterend", button);
    console.log("[Rental] Button injected");
  }

  function snapshotPkmnData(id) {
    return {
      level: pkmn[id].level,
      exp: pkmn[id].exp,
      ivs: JSON.parse(JSON.stringify(pkmn[id].ivs || {})),
      moves: JSON.parse(JSON.stringify(pkmn[id].moves || {})),
      movepool: JSON.parse(JSON.stringify(pkmn[id].movepool || [])),
      newmoves: JSON.parse(JSON.stringify(pkmn[id].newmoves || [])),
      newEvolution: pkmn[id].newEvolution,
      ability: pkmn[id].ability,
      shiny: pkmn[id].shiny,
      shinyDisabled: pkmn[id].shinyDisabled,
      hiddenAbilityUnlocked: pkmn[id].hiddenAbilityUnlocked,
      tag: pkmn[id].tag,
      ribbons: JSON.parse(JSON.stringify(pkmn[id].ribbons || []))
    };
  }

  function restorePkmnData(id, snapshot) {
    pkmn[id].level = snapshot.level;
    pkmn[id].exp = snapshot.exp;
    pkmn[id].ivs = snapshot.ivs;
    pkmn[id].moves = snapshot.moves;
    pkmn[id].movepool = snapshot.movepool;
    pkmn[id].newmoves = snapshot.newmoves;
    pkmn[id].newEvolution = snapshot.newEvolution;
    pkmn[id].ability = snapshot.ability;
    pkmn[id].shiny = snapshot.shiny;
    pkmn[id].shinyDisabled = snapshot.shinyDisabled;
    pkmn[id].hiddenAbilityUnlocked = snapshot.hiddenAbilityUnlocked;
    pkmn[id].tag = snapshot.tag;
    pkmn[id].ribbons = snapshot.ribbons;
  }

  function snapshotTeam() {
    const snapshot = [];
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const slotKey = `slot${i}`;
      const slot = team[slotKey];
      snapshot.push({
        pkmnId: slot?.pkmn?.id,
        item: slot?.item
      });
    }
    return snapshot;
  }

  function restoreTeam(snapshot) {
    if (!snapshot) return;
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const slotKey = `slot${i}`;
      const slotData = snapshot[i - 1];
      if (slotData?.pkmnId) {
        team[slotKey].pkmn = pkmn[slotData.pkmnId];
        team[slotKey].item = slotData.item;
      } else {
        team[slotKey].pkmn = undefined;
        team[slotKey].item = undefined;
      }
    }
  }

  function buildSlotData(id, slot) {
    if (!id || !pkmn[id]) return null;
    const data = pkmn[id];
    const ivs = IV_KEYS.map(key => Number(data.ivs?.[key] ?? 0));
    const moves = [
      data.moves?.slot1,
      data.moves?.slot2,
      data.moves?.slot3,
      data.moves?.slot4
    ].map(moveId => moveId ?? null);

    return [
      id,
      Number(data.level ?? 1),
      data.shiny === true ? 1 : 0,
      data.ability ?? null,
      slot?.item ?? null,
      moves,
      ivs
    ];
  }

  function validateSlotData(slotData) {
    if (!slotData) return null;

    const id = slotData[SLOT_FIELDS.id];
    const level = slotData[SLOT_FIELDS.level];
    const shiny = slotData[SLOT_FIELDS.shiny];
    const abilityId = slotData[SLOT_FIELDS.ability];
    const itemId = slotData[SLOT_FIELDS.item];
    const moves = slotData[SLOT_FIELDS.moves];
    const ivs = slotData[SLOT_FIELDS.ivs];

    if (!pkmn[id]) return `Unknown Pokemon: ${id}`;
    if (!Number.isInteger(level) || level < 1 || level > 100) return `${format(id)} has invalid level`;
    if (shiny !== 0 && shiny !== 1) return `${format(id)} has invalid shiny flag`;

    if (abilityId && !ability[abilityId]) return `${format(id)} has invalid ability`;

    if (itemId) {
      if (!item[itemId]) return `${format(id)} has invalid item`;
      if (item[itemId].type !== "held") return `${format(id)} has invalid held item`;
    }

    if (!Array.isArray(moves) || moves.length !== MOVE_SLOTS) {
      return `${format(id)} has invalid moves`;
    }

    const movepool = pkmn[id].movepool || [];
    for (const moveId of moves) {
      if (!moveId) continue;
      if (!move[moveId]) return `${format(id)} has invalid move`;
      if (!movepool.includes(moveId)) return `${format(id)} does not know ${format(moveId)}`;
    }

    if (!Array.isArray(ivs) || ivs.length !== IV_KEYS.length) {
      return `${format(id)} has invalid IVs`;
    }

    for (const value of ivs) {
      if (!Number.isInteger(value) || value < 0 || value > 6) {
        return `${format(id)} has invalid IVs`;
      }
    }

    return null;
  }

  function encodeTeamCode() {
    const currentTeam = saved.previewTeams?.[saved.currentPreviewTeam];
    if (!currentTeam) return { error: "No preview team selected." };

    const slots = [];
    for (let i = 1; i <= SLOT_COUNT; i++) {
      const slotKey = `slot${i}`;
      const slot = currentTeam[slotKey];
      const slotData = buildSlotData(slot?.pkmn, slot);
      slots.push(slotData);
    }

    if (!slots[0] || !slots[0][SLOT_FIELDS.id]) {
      return { error: "Slot 1 cannot be empty." };
    }

    for (const slotData of slots) {
      if (!slotData) continue;
      const error = validateSlotData(slotData);
      if (error) return { error };
    }

    const payload = { v: 1, ts: Date.now(), t: slots };
    const json = JSON.stringify(payload);
    const code = btoa(json);

    return { code };
  }

  function decodeTeamCode(raw) {
    try {
      const json = atob(raw.trim());
      const data = JSON.parse(json);
      if (!data || data.v !== 1 || !Array.isArray(data.t) || data.t.length !== SLOT_COUNT) {
        return { error: "Invalid rental code." };
      }

      if (!Number.isInteger(data.ts)) {
        return { error: "Rental code is missing a timestamp." };
      }

      const ageMs = Date.now() - data.ts;
      if (ageMs > 60 * 60 * 1000) {
        return { error: "Rental code expired (older than 1 hour)." };
      }

      for (const slotData of data.t) {
        if (!slotData) continue;
        const error = validateSlotData(slotData);
        if (error) return { error };
      }

      if (!data.t[0] || !data.t[0][SLOT_FIELDS.id]) {
        return { error: "Slot 1 cannot be empty." };
      }

      return { data };
    } catch (err) {
      return { error: "Invalid rental code." };
    }
  }

  function applyRentalTeam(teamData) {
    const slots = teamData.t;
    rentalState.snapshot = snapshotTeam();
    rentalState.pkmnSnapshots = {};

    for (let i = 1; i <= SLOT_COUNT; i++) {
      const slotKey = `slot${i}`;
      const slotData = slots[i - 1];

      if (!slotData) {
        team[slotKey].pkmn = undefined;
        team[slotKey].item = undefined;
        continue;
      }

      const id = slotData[SLOT_FIELDS.id];
      const level = slotData[SLOT_FIELDS.level];
      const shiny = slotData[SLOT_FIELDS.shiny] === 1;
      const abilityId = slotData[SLOT_FIELDS.ability];
      const itemId = slotData[SLOT_FIELDS.item];
      const moves = slotData[SLOT_FIELDS.moves] || [];
      const ivs = slotData[SLOT_FIELDS.ivs] || [];

      if (!rentalState.pkmnSnapshots[id]) {
        rentalState.pkmnSnapshots[id] = snapshotPkmnData(id);
      }

      pkmn[id].level = level;
      pkmn[id].exp = 0;
      pkmn[id].ivs = {
        hp: ivs[0] ?? 0,
        atk: ivs[1] ?? 0,
        def: ivs[2] ?? 0,
        satk: ivs[3] ?? 0,
        sdef: ivs[4] ?? 0,
        spe: ivs[5] ?? 0
      };
      pkmn[id].moves = {
        slot1: moves[0] ?? undefined,
        slot2: moves[1] ?? undefined,
        slot3: moves[2] ?? undefined,
        slot4: moves[3] ?? undefined
      };
      pkmn[id].ability = abilityId ?? pkmn[id].ability;
      pkmn[id].shiny = shiny;
      pkmn[id].shinyDisabled = false;

      team[slotKey].pkmn = pkmn[id];
      team[slotKey].item = itemId ?? undefined;
    }

    rentalState.active = true;
    rentalState.restorePending = true;
    saved.rentalLastUsedDate = todayStamp();
    const tracker = getDefeatTracker();
    tracker.count = 0;
    tracker.areaId = saved.currentArea;
    removeRentalButton();
  }

  function restoreRentalTeam() {
    if (!rentalState.restorePending) return;

    restoreTeam(rentalState.snapshot);
    for (const id in rentalState.pkmnSnapshots) {
      restorePkmnData(id, rentalState.pkmnSnapshots[id]);
    }

    rentalState.snapshot = null;
    rentalState.pkmnSnapshots = {};
    rentalState.active = false;
    rentalState.restorePending = false;
  }

  function showRentalError(message) {
    document.getElementById("tooltipMid").innerHTML = message;
  }

  function openRentalTooltip() {
    if (rentalUsedToday()) {
      document.getElementById("tooltipTop").style.display = "none";
      document.getElementById("tooltipTitle").innerHTML = "Rental Used";
      document.getElementById("tooltipMid").innerHTML = "You can only rent a team once per day.";
      document.getElementById("tooltipBottom").innerHTML = "";
      openTooltip();
      return;
    }

    document.getElementById("tooltipTop").style.display = "none";
    document.getElementById("tooltipTitle").innerHTML = "Rental Team";
    document.getElementById("tooltipMid").innerHTML = "Paste a rental team code to fight once.";

    const bottom = document.getElementById("tooltipBottom");
    bottom.innerHTML = '<span id="prevent-tooltip-exit"></span>';

    const input = document.createElement("textarea");
    input.placeholder = "Paste rental code here";
    input.style.width = "100%";
    input.style.height = "6rem";
    input.style.borderRadius = "0.4rem";
    input.style.border = "none";
    input.style.padding = "0.5rem";
    input.style.resize = "none";
    input.style.marginTop = "0.5rem";

    const button = document.createElement("div");
    button.className = "auto-build-confirm";
    button.textContent = "Start Rental";
    button.style.cursor = "pointer";
    button.style.fontSize = "1.3rem";
    button.style.display = "flex";
    button.style.justifyContent = "center";
    button.style.alignItems = "center";
    button.style.padding = "0.4rem";

    button.addEventListener("click", () => {
      const raw = input.value;
      if (!raw) {
        showRentalError("Paste a rental code first.");
        return;
      }

      const result = decodeTeamCode(raw);
      if (result.error) {
        showRentalError(result.error);
        return;
      }

      applyRentalTeam(result.data);
      closeTooltip();
      rejoinArea();
    });

    bottom.appendChild(input);
    bottom.appendChild(button);

    openTooltip();
  }

  let leaveCombatWrapped = false;
  let saveExitListenerAdded = false;

  function setupSaveExitListener() {
    if (saveExitListenerAdded) return;
    document.addEventListener("click", (event) => {
      const target = event.target.closest(".pkmn-leave-exit");
      if (!target) return;
      resetLossTracker("save-exit");
    });
    saveExitListenerAdded = true;
  }

  function wrapLeaveCombat() {
    if (leaveCombatWrapped) return true;
    if (typeof leaveCombat !== "function") return false;
    const original = leaveCombat;

    leaveCombat = function () {
      const loss = isTeamDefeated();
      rentalState.lastLoss = loss;
      const lossCount = updateDefeatTracker(loss);

      const result = original();

      if (rentalState.restorePending) {
        restoreRentalTeam();
      }

      setTimeout(() => {
        showRentalButton(lossCount);
      }, 0);

      return result;
    };

    leaveCombatWrapped = true;
    return true;
  }

  function initLeaveCombatHook() {
    setupSaveExitListener();
    if (wrapLeaveCombat()) return;
    setTimeout(initLeaveCombatHook, 500);
  }

  window.exportTeamCode = function () {
    const result = encodeTeamCode();
    if (result.error) {
      console.warn(result.error);
      return null;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(result.code).catch(() => {});
    }

    console.log("Rental team code:", result.code);
    return result.code;
  };

  initLeaveCombatHook();
})();
