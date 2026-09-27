/*
 * Match pairs (EN ↔ VI) — recognition warm-up used in every top product
 * (Duolingo "match pairs", Babbel matching). Fully deterministic: click a
 * left chip then a right chip; correct pairs lock, misses shake loose.
 * Ungraded by design — it prepares the graded drill that follows.
 */
export function mountMatchPairs(el, pairs, { onDone } = {}) {
  const grid = document.createElement('div');
  grid.className = 'match-grid';
  const status = document.createElement('p');
  status.className = 'match-status';
  status.hidden = true;

  const order = { en: shuffle(pairs.map((_, i) => i)), vi: shuffle(pairs.map((_, i) => i)) };
  let selected = null;
  let solved = 0;
  let misses = 0;

  for (const col of ['en', 'vi']) {
    const colEl = document.createElement('div');
    colEl.className = `match-col match-${col}`;
    for (const pairIndex of order[col]) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'match-chip';
      chip.dataset.pair = String(pairIndex);
      chip.dataset.col = col;
      chip.textContent = pairs[pairIndex][col === 'en' ? 0 : 1];
      chip.addEventListener('click', () => pick(col, pairIndex, chip));
      colEl.appendChild(chip);
    }
    grid.appendChild(colEl);
  }

  function pick(col, pairIndex, chip) {
    if (chip.disabled) return;
    if (!selected) {
      selected = { col, pairIndex, chip };
      chip.classList.add('match-picked');
      return;
    }
    if (selected.chip === chip) {
      chip.classList.remove('match-picked');
      selected = null;
      return;
    }
    const hit =
      selected.col !== col && selected.pairIndex === pairIndex;
    if (hit) {
      selected.chip.disabled = true;
      chip.disabled = true;
      selected.chip.classList.remove('match-picked');
      selected.chip.classList.add('match-hit');
      chip.classList.add('match-hit');
      solved++;
      if (solved === pairs.length) {
        status.textContent = misses
          ? `Ghép xong ${pairs.length} cặp — trượt ${misses} lần, xem lại cụm bên trên nhé.`
          : `Ghép xong ${pairs.length}/${pairs.length} cặp — một lần không trượt!`;
        status.hidden = false;
        onDone?.({ misses });
      }
    } else {
      misses++;
      selected.chip.classList.add('match-miss');
      chip.classList.add('match-miss');
      const prev = selected.chip;
      // brief shake, then both deselect
      setTimeout(() => {
        prev.classList.remove('match-picked', 'match-miss');
        chip.classList.remove('match-miss');
      }, 350);
    }
    selected = null;
  }

  el.append(grid, status);
}

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
