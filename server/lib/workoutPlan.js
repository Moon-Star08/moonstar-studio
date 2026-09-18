/* Per-user workout + nutrition plan generator.
   Pure functions, no DB. Given a questionnaire profile it returns a plan
   object the front-end renders (same shape the tracker already uses):
     { start, athlete, target, meals[], days[] }
   Exercise videos are mapped to names on the client, so here we only emit
   exercise name / sets / reps / muscles. */

'use strict';

// ── Exercise library ─────────────────────────────────────────────────────
// name: [muscles, sets, reps, rest]
const EX = {
  // Gym
  'Leg Press': ['Quads / glutes / hamstrings', 3, '10', '2 min'],
  'Romanian Deadlift (RDL)': ['Hamstrings / glutes', 3, '10', '2 min'],
  'Leg Curl': ['Hamstrings', 3, '12', '90 sec'],
  'Leg Extension': ['Quads', 3, '12', '90 sec'],
  'Goblet Squat': ['Quads / glutes', 3, '10', '2 min'],
  'Calf Raise': ['Calves', 3, '15', '60 sec'],
  'Machine Chest Press': ['Chest / triceps', 3, '10', '2 min'],
  'Dumbbell Bench Press': ['Chest / triceps', 3, '10', '2 min'],
  'Incline Dumbbell Press': ['Upper chest / shoulders', 3, '10', '2 min'],
  'Lat Pulldown': ['Lats / upper back / biceps', 3, '10', '2 min'],
  'Seated Cable Row': ['Back / biceps', 3, '10', '2 min'],
  'Dumbbell Shoulder Press': ['Shoulders / triceps', 3, '10', '2 min'],
  'Machine Shoulder Press': ['Shoulders', 3, '10', '2 min'],
  'Dumbbell Lateral Raise': ['Side delts', 3, '15', '60 sec'],
  'Dumbbell Curl': ['Biceps', 3, '12', '60 sec'],
  'Hammer Curl': ['Biceps / forearms', 3, '12', '60 sec'],
  'Cable Curl': ['Biceps', 3, '12', '60 sec'],
  'Triceps Pushdown': ['Triceps', 3, '12', '60 sec'],
  'Overhead Triceps Extension': ['Triceps', 3, '12', '60 sec'],
  'Plank': ['Core', 3, '30–45 sec', '45 sec'],
  'Cable Crunch': ['Abs', 3, '15', '60 sec'],
  'Dead Bug': ['Core', 3, '10 / side', '45 sec'],
  // Home / bodyweight
  'Push-up': ['Chest / triceps', 3, '8–15', '75 sec'],
  'Incline Push-up': ['Chest (easier)', 3, '10–15', '75 sec'],
  'Chair Dips': ['Triceps', 3, '10–15', '60 sec'],
  'Bodyweight Squat': ['Quads / glutes', 3, '15–20', '75 sec'],
  'Reverse Lunge': ['Legs / glutes', 3, '10 / side', '75 sec'],
  'Glute Bridge': ['Glutes / hamstrings', 3, '15–20', '60 sec'],
  'Wall Sit': ['Quads', 3, '30–45 sec', '60 sec'],
  'Bodyweight Calf Raise': ['Calves', 3, '20', '45 sec'],
  'Superman': ['Lower back', 3, '12–15', '45 sec'],
  'Bird Dog': ['Core / back', 3, '10 / side', '45 sec'],
  'Bicycle Crunch': ['Abs / obliques', 3, '20 total', '45 sec'],
  'Jumping Jacks': ['Full-body cardio', 3, '40 sec', '30 sec'],
  'Mountain Climbers': ['Core / cardio', 3, '40 sec', '30 sec'],
  'High Knees': ['Cardio / legs', 3, '40 sec', '30 sec'],
};

// ── Day templates (lists of exercise names) ──────────────────────────────
const GYM = {
  'Full Body A': ['Leg Press', 'Machine Chest Press', 'Lat Pulldown', 'Dumbbell Shoulder Press', 'Dumbbell Curl', 'Triceps Pushdown', 'Plank'],
  'Full Body B': ['Goblet Squat', 'Incline Dumbbell Press', 'Seated Cable Row', 'Dumbbell Lateral Raise', 'Hammer Curl', 'Overhead Triceps Extension', 'Dead Bug'],
  'Full Body C': ['Romanian Deadlift (RDL)', 'Dumbbell Bench Press', 'Lat Pulldown', 'Leg Extension', 'Cable Curl', 'Triceps Pushdown', 'Cable Crunch'],
  'Upper A': ['Machine Chest Press', 'Lat Pulldown', 'Dumbbell Shoulder Press', 'Dumbbell Curl', 'Triceps Pushdown', 'Plank'],
  'Lower A': ['Leg Press', 'Romanian Deadlift (RDL)', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Dead Bug'],
  'Upper B': ['Incline Dumbbell Press', 'Seated Cable Row', 'Dumbbell Lateral Raise', 'Hammer Curl', 'Overhead Triceps Extension', 'Cable Crunch'],
  'Lower B': ['Goblet Squat', 'Romanian Deadlift (RDL)', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Plank'],
  'Push': ['Machine Chest Press', 'Incline Dumbbell Press', 'Dumbbell Shoulder Press', 'Dumbbell Lateral Raise', 'Triceps Pushdown', 'Overhead Triceps Extension'],
  'Pull': ['Lat Pulldown', 'Seated Cable Row', 'Dumbbell Curl', 'Hammer Curl', 'Cable Curl', 'Cable Crunch'],
  'Legs': ['Leg Press', 'Romanian Deadlift (RDL)', 'Leg Curl', 'Leg Extension', 'Calf Raise', 'Plank'],
};
const HOME = {
  'Full Body A': ['Bodyweight Squat', 'Push-up', 'Glute Bridge', 'Superman', 'Plank', 'Jumping Jacks'],
  'Full Body B': ['Reverse Lunge', 'Incline Push-up', 'Bird Dog', 'Chair Dips', 'Bicycle Crunch', 'Mountain Climbers'],
  'Full Body C': ['Wall Sit', 'Push-up', 'Glute Bridge', 'Superman', 'Plank', 'High Knees'],
  'Upper Body': ['Push-up', 'Incline Push-up', 'Chair Dips', 'Superman', 'Bird Dog', 'Plank'],
  'Lower Body': ['Bodyweight Squat', 'Reverse Lunge', 'Glute Bridge', 'Wall Sit', 'Bodyweight Calf Raise', 'Bicycle Crunch'],
  'Cardio + Core': ['Jumping Jacks', 'High Knees', 'Mountain Climbers', 'Plank', 'Bicycle Crunch', 'Superman'],
};

// Which templates run, in order, for a given days-per-week.
const SCHED = {
  gym: { 3: ['Full Body A', 'Full Body B', 'Full Body C'], 4: ['Upper A', 'Lower A', 'Upper B', 'Lower B'], 5: ['Push', 'Pull', 'Legs', 'Upper A', 'Lower B'] },
  home: { 3: ['Full Body A', 'Full Body B', 'Full Body C'], 4: ['Upper Body', 'Lower Body', 'Full Body A', 'Cardio + Core'], 5: ['Upper Body', 'Lower Body', 'Cardio + Core', 'Full Body A', 'Full Body B'] },
};
// Weekday indexes (0=first day of plan week) that are training days.
const TRAIN_DAYS = { 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4] };

const FOCUS = {
  'Full Body A': 'Full body', 'Full Body B': 'Full body', 'Full Body C': 'Full body',
  'Upper A': 'Chest · back · shoulders · arms', 'Upper B': 'Chest · back · shoulders · arms',
  'Lower A': 'Legs · glutes · core', 'Lower B': 'Legs · glutes · core',
  'Push': 'Chest · shoulders · triceps', 'Pull': 'Back · biceps · core', 'Legs': 'Legs · glutes · core',
  'Upper Body': 'Chest · back · arms · core', 'Lower Body': 'Legs · glutes · core', 'Cardio + Core': 'Heart rate + abs',
};

// ── Meal library ─────────────────────────────────────────────────────────
// tags = "like" categories the user can tick. flags mark what a meal contains
// (used for diet + allergy filtering).
// f: {veg, vegan, pork, beef, fish, egg, dairy, nuts, gluten}
function meal(slot, name, food, kcal, protein, tags, f) {
  return { slot, name, food, kcal, protein, tags, f: f || {} };
}
const MEALS = [
  // breakfast
  meal('Breakfast', 'Oats & yogurt bowl', 'Rolled oats with Greek yogurt, banana and honey', 450, 25, ['oats', 'dairy', 'fruit'], { veg: true, dairy: true, gluten: true }),
  meal('Breakfast', 'Egg & toast', 'Scrambled eggs on wholegrain toast with tomatoes', 420, 26, ['eggs', 'bread', 'veg'], { veg: true, egg: true, gluten: true }),
  meal('Breakfast', 'Chicken congee', 'Rice porridge with shredded chicken and spring onion', 430, 28, ['rice', 'chicken'], { }),
  meal('Breakfast', 'Tofu scramble', 'Scrambled tofu with peppers on wholegrain toast', 400, 22, ['beans', 'veg', 'bread'], { veg: true, vegan: true, gluten: true }),
  meal('Breakfast', 'Peanut oat shake', 'Oats, banana, peanut butter and milk blended', 480, 24, ['oats', 'fruit', 'dairy', 'nuts'], { veg: true, dairy: true, nuts: true, gluten: true }),
  // lunch
  meal('Lunch', 'Chicken rice bowl', 'Grilled chicken breast, rice and mixed vegetables', 600, 45, ['chicken', 'rice', 'veg'], { }),
  meal('Lunch', 'Beef noodle bowl', 'Lean beef strips with noodles and greens', 620, 40, ['beef', 'noodles', 'veg'], { beef: true, gluten: true }),
  meal('Lunch', 'Salmon & potato', 'Baked salmon with potatoes and salad', 590, 38, ['fish', 'potato', 'veg'], { fish: true }),
  meal('Lunch', 'Tofu stir-fry & rice', 'Tofu and vegetable stir-fry over rice', 560, 26, ['beans', 'veg', 'rice'], { veg: true, vegan: true }),
  meal('Lunch', 'Egg fried rice', 'Rice with egg, peas and chicken', 580, 32, ['rice', 'eggs', 'chicken'], { egg: true }),
  meal('Lunch', 'Bean & veg pasta', 'Wholegrain pasta with beans and tomato sauce', 550, 24, ['noodles', 'beans', 'veg'], { veg: true, vegan: true, gluten: true }),
  // dinner
  meal('Dinner', 'Chicken & potato', 'Roast chicken with potatoes and steamed veg', 620, 45, ['chicken', 'potato', 'veg'], { }),
  meal('Dinner', 'Beef & rice', 'Lean beef with rice and stir-fried vegetables', 640, 42, ['beef', 'rice', 'veg'], { beef: true }),
  meal('Dinner', 'Fish & noodles', 'White fish with noodles and bok choy', 560, 36, ['fish', 'noodles', 'veg'], { fish: true, gluten: true }),
  meal('Dinner', 'Tofu & rice bowl', 'Braised tofu with rice and greens', 540, 24, ['beans', 'rice', 'veg'], { veg: true, vegan: true }),
  meal('Dinner', 'Omelette & salad', 'Three-egg omelette with cheese and side salad', 520, 30, ['eggs', 'dairy', 'veg'], { veg: true, egg: true, dairy: true }),
  meal('Dinner', 'Chicken noodle soup', 'Chicken, noodles and vegetables in broth', 560, 38, ['chicken', 'noodles', 'veg'], { gluten: true }),
  // snacks
  meal('Snack', 'Greek yogurt & fruit', 'Greek yogurt with berries', 220, 18, ['dairy', 'fruit'], { veg: true, dairy: true }),
  meal('Snack', 'Protein shake', 'Whey protein with water or milk', 180, 25, ['dairy'], { veg: true, dairy: true }),
  meal('Snack', 'Boiled eggs', 'Two boiled eggs', 160, 13, ['eggs'], { veg: true, egg: true }),
  meal('Snack', 'Banana & peanut butter', 'Banana with a spoon of peanut butter', 260, 8, ['fruit', 'nuts'], { veg: true, vegan: true, nuts: true }),
  meal('Snack', 'Edamame', 'Steamed edamame beans with salt', 190, 17, ['beans', 'veg'], { veg: true, vegan: true }),
  meal('Snack', 'Rice cakes & tuna', 'Rice cakes topped with tuna', 230, 20, ['fish', 'rice'], { fish: true }),
];

const SLOT_SPLIT = {
  3: [['Breakfast', 0.3], ['Lunch', 0.37], ['Dinner', 0.33]],
  4: [['Breakfast', 0.25], ['Lunch', 0.3], ['Dinner', 0.3], ['Snack', 0.15]],
  5: [['Breakfast', 0.22], ['Snack', 0.13], ['Lunch', 0.3], ['Dinner', 0.28], ['Snack', 0.07]],
};

// ── helpers ──────────────────────────────────────────────────────────────
function clampNum(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function iso(d) { return d.toISOString().slice(0, 10); }
const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeTargets(p) {
  const kg = clampNum(Number(p.weight_kg) || 70, 35, 250);
  const cm = clampNum(Number(p.height_cm) || 170, 120, 230);
  const age = clampNum(Number(p.age) || 25, 14, 90);
  const male = p.sex !== 'female';
  const bmr = 10 * kg + 6.25 * cm - 5 * age + (male ? 5 : -161);
  const dpw = [3, 4, 5].includes(Number(p.days_per_week)) ? Number(p.days_per_week) : 3;
  const factorTable = { gym: { 3: 1.45, 4: 1.55, 5: 1.65 }, home: { 3: 1.4, 4: 1.5, 5: 1.6 } };
  const loc = p.location === 'home' ? 'home' : 'gym';
  const tdee = bmr * factorTable[loc][dpw];
  let calories;
  if (p.goal === 'lose') calories = tdee * 0.8;
  else if (p.goal === 'gain') calories = tdee * 1.1;
  else calories = tdee;
  calories = Math.round(calories / 10) * 10;
  const proteinPerKg = p.goal === 'lose' ? 2.0 : 1.8;
  const protein = Math.round(kg * proteinPerKg);
  const fat = Math.round(kg * 0.8);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = (kg < 70 ? '2–2.5' : kg < 90 ? '2.5–3' : '3–3.5') + ' L';
  return { kg, cm, age, male, dpw, loc, calories, protein, fat, carbs, water, tdee: Math.round(tdee) };
}

function buildMeals(p, t) {
  const dislikes = new Set((p.dislikes || []).map(String));
  const allergies = new Set((p.allergies || []).map(String)); // dairy, egg, nuts, gluten, fish
  const likes = new Set((p.likes || []).map(String));
  const diet = p.diet || 'none';

  function allowed(m) {
    // diet
    if (diet === 'vegetarian' && !m.f.veg) return false;
    if (diet === 'vegan' && !m.f.vegan) return false;
    if (diet === 'no_pork' && m.f.pork) return false;
    if (diet === 'no_beef' && m.f.beef) return false;
    // allergies
    for (const a of allergies) { if (m.f[a]) return false; }
    // dislikes (by tag)
    for (const tag of m.tags) { if (dislikes.has(tag)) return false; }
    return true;
  }
  function score(m) {
    let s = 0;
    for (const tag of m.tags) if (likes.has(tag)) s += 1;
    return s;
  }

  const split = SLOT_SPLIT[t.dpw] || SLOT_SPLIT[3];
  const usedNames = new Set();
  const out = [];
  const timeBySlot = { Breakfast: '7–9 am', Lunch: '12–1 pm', Dinner: '6–8 pm', Snack: 'between meals' };

  for (const [slot, frac] of split) {
    let pool = MEALS.filter((m) => m.slot === slot && allowed(m));
    if (!pool.length) pool = MEALS.filter((m) => m.slot === slot); // fallback ignores prefs if diet is very restrictive
    pool = pool.slice().sort((a, b) => score(b) - score(a));
    // avoid repeating the same meal name; pick best not-yet-used, else best.
    let pick = pool.find((m) => !usedNames.has(m.name)) || pool[0];
    usedNames.add(pick.name);
    const kcal = Math.round((t.calories * frac) / 10) * 10;
    out.push({
      meal: slot,
      food: pick.name + ' — ' + pick.food,
      time: timeBySlot[slot] || '',
      note: '≈' + kcal + ' kcal · ≈' + pick.protein + ' g protein',
    });
  }
  return out;
}

function buildCalendar(p, t, meals) {
  const days = [];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const lib = t.loc === 'home' ? HOME : GYM;
  const rota = (SCHED[t.loc][t.dpw] || SCHED[t.loc][3]).slice();
  const trainSet = new Set(TRAIN_DAYS[t.dpw] || TRAIN_DAYS[3]);
  const TOTAL = 84; // 12 weeks
  let rotaIdx = 0;

  for (let i = 0; i < TOTAL; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const weekday = i % 7; // 0 = first plan day
    const dayNum = i + 1;
    const checkin = dayNum % 14 === 0;
    const isTrain = trainSet.has(weekday);

    if (isTrain) {
      const tmpl = rota[rotaIdx % rota.length];
      rotaIdx++;
      const exercises = lib[tmpl].map((name) => {
        const e = EX[name] || ['', 3, '10', '60 sec'];
        return { name, muscles: e[0], sets: e[1], reps: e[2], rest: e[3] };
      });
      days.push({
        day: dayNum, date: iso(date), dayName: DOW[date.getDay()], type: 'workout',
        title: tmpl, focus: FOCUS[tmpl] || '', checkin,
        calories: t.calories, protein: t.protein + ' g', water: t.water, sleep: '7–9 h',
        exercises,
      });
    } else {
      const walk = t.loc === 'home' ? '30–40 min walk / 8–10k steps' : '20–30 min walk / 6–8k steps';
      days.push({
        day: dayNum, date: iso(date), dayName: DOW[date.getDay()], type: 'rest',
        title: 'Rest', focus: walk, checkin,
        calories: t.calories, protein: t.protein + ' g', water: t.water, sleep: '7–9 h',
        exercises: [],
        rest: walk,
      });
    }
  }
  return days;
}

function generatePlan(profile) {
  const p = profile || {};
  const t = computeTargets(p);
  const meals = buildMeals(p, t);
  const days = buildCalendar(p, t, meals);
  const goalLabel = p.goal === 'lose' ? 'Lose fat' : p.goal === 'gain' ? 'Build muscle' : 'Maintain';
  const athlete = [
    (p.name ? p.name + ' · ' : ''),
    'Age ' + t.age, t.male ? 'Male' : 'Female', t.kg + ' kg', t.cm + ' cm',
  ].join(' · ').replace('· ·', '·');
  return {
    start: iso(new Date()),
    location: t.loc,
    athlete,
    goal: goalLabel,
    target: ['≈' + t.calories + ' kcal', '≈' + t.protein + ' g protein', '≈' + t.carbs + ' g carbs', '≈' + t.fat + ' g fat'],
    targetLine: '≈' + t.calories + ' kcal | ≈' + t.protein + ' g protein | ≈' + t.carbs + ' g carbs | ≈' + t.fat + ' g fat',
    meals,
    days,
  };
}

module.exports = { generatePlan, computeTargets };
