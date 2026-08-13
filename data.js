/* Dados do plano — fonte: planilhas cutting.xlsx / estabilização.xlsx e treinos.pdf (Semana 3 a 6). */
const DATA = {
  config: {
    // 12/08/2026 (quarta) = Treino C. A sequência A→B→C→D avança a cada dia de
    // treino (seg, ter, qua, sex, sáb), independente do dia da semana.
    anchorDate: '2026-08-12',
    anchorWorkoutIndex: 2, // C
    // 13/08/2026 (quinta) = primeiro descanso ativo, protocolo A; alterna A/B a cada descanso.
    anchorRestDate: '2026-08-13',
    trainingWeekdays: [1, 2, 3, 5, 6], // seg ter qua sex sáb
    workoutTime: '20:00',
    checkinWeekday: 0, // domingo
    firstCheckinDate: '2026-08-13', // primeiro check-in, fora do ciclo semanal de domingo
    goal: { startDate: '2026-08-12', startKg: 100, targetDate: '2026-12-31', targetKg: 80, heightM: 1.75 },
  },

  phases: [
    { start: '2026-08-12', end: '2026-10-11', diet: 'cutting', label: 'Cutting — Bloco 1' },
    { start: '2026-10-12', end: '2026-10-18', diet: 'estabilizacao', label: 'Diet Break' },
    { start: '2026-10-19', end: '2026-12-13', diet: 'cutting', label: 'Cutting — Bloco 2' },
    { start: '2026-12-14', end: '2099-12-31', diet: 'estabilizacao', label: 'Estabilização' },
  ],

  workouts: {
    A: {
      name: 'Upper 1', group: 'upper', rest: '90–180s',
      exercises: [
        { name: 'Puxada MapFit Grande', sets: [['Aquecimento', '1–2 × 15–20'], ['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Remada Articulada Pronada', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Supino Vertical Inclinado', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Crucifixo Máquina', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Elevação Lateral Máquina', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Tríceps Francês Polia + Rosca Corda Polia', pair: true,
          sets: [['Cada exercício', '2 × 3–6 (prep.) + 2 × 8–10 (trab.)']] },
      ],
    },
    B: {
      name: 'Lower 1', group: 'lower', rest: '90–180s',
      exercises: [
        { name: 'Mesa Flexora', sets: [['Aquecimento', '1–2 × 15–20'], ['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Cadeira Adutora', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'LegPress 45º', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Afundo Smith', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Stiff Halter', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
      ],
    },
    C: {
      name: 'Upper 2', group: 'upper', rest: '90–180s',
      exercises: [
        { name: 'Desenvolvimento Articulado', sets: [['Aquecimento', '1–2 × 15–20'], ['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Supino Inclinado Halter', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Elevação Lateral Halter', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Remada Baixa Triângulo', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Puxada Supinada', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Rosca Scott Máquina + Tríceps Máquina', pair: true,
          sets: [['Cada exercício', '2 × 3–6 (prep.) + 2 × 8–10 (trab.)']] },
      ],
    },
    D: {
      name: 'Lower 2', group: 'lower', rest: '90–180s',
      exercises: [
        { name: 'Cadeira Extensora', sets: [['Aquecimento', '1–2 × 15–20'], ['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Cadeira Flexora', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Agachamento Hack', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Elevação Pélvica', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
        { name: 'Cadeira Abdutora', sets: [['Preparação', '2–3 × 3–6'], ['Trabalho', '2 × 8–10']] },
      ],
    },
  },

  setNotes: [
    ['Aquecimento', 'séries longas com carga baixa — aquecer e preparar músculos/tendões/articulações.'],
    ['Preparação', 'séries curtas com progressão de carga até chegar às cargas de trabalho, sem fadiga excessiva.'],
    ['Trabalho', 'séries válidas — falha muscular (ou próximo) dentro do limite de repetições, mantendo padrão mecânico e cadência.'],
  ],

  // Descanso ativo (qui/dom): abdômen (2x/semana) + antebraço + panturrilha, sempre alternando
  // protocolos A/B. Panturrilha é 3–4x/semana (fonte: PDF) — o app também oferece o protocolo
  // como opcional pós-treino nos dias de treino (ver calfProtocol em app.js).
  restDay: {
    rest: '30–45s',
    abs: {
      A: [
        { name: 'Abdominal com Corda Polia Alta', sets: '5 × 10–15 (prog.)', note: 'focar na cadência', link: 'https://www.youtube.com/shorts/jXu-yJq9m3s' },
        { name: 'Abdominal Oblíquo Manopla Polia Alta', sets: '4 × 8–12 (prog.)', link: 'https://www.youtube.com/shorts/1ayrOmqrnK0' },
        { name: 'Abdominal Infra Colchonete + Escalador', pair: true, sets: 'Infra: 4 × 15–20', link: 'https://www.youtube.com/shorts/FDbbLABj5tc' },
      ],
      B: [
        { name: 'Abdominal Máquina', sets: '5 × 10–15 (prog.)', note: '2" de pico' },
        { name: 'Abdominal Infra Paralela', sets: '4 × 10–15' },
        { name: 'Abdominal Boxeador + Canivete Colchonete Box', pair: true, sets: 'Boxeador: 3 × 15–20 · Canivete: 3 × falha', link: 'https://www.youtube.com/shorts/h313Yleb-ek', link2: 'https://www.youtube.com/shorts/51Ryd2Ds2CI' },
        { name: 'Abdominal SuperMan + Prancha 4 Apoios', pair: true, sets: 'SuperMan: 3 × 10–15 · Prancha: 3 × falha', link: 'https://www.youtube.com/shorts/hC8zW8GgpYg' },
      ],
    },
    calves: {
      A: [
        { name: 'Panturrilha em Pé Máquina', sets: '6 × 8–12 (prog.)', note: '2" de pico embaixo' },
        { name: 'Panturrilha + Tibial Anterior Leg Horizontal', pair: true, sets: 'Pantu: 4 × 10–15 (prog.) (2" pico) · Tibial: 4 × 10–15 (prog.)' },
      ],
      B: [
        { name: 'Gêmeos Sentado', sets: '6 × 8–12 (prog.)', note: '2" de pico' },
        { name: 'Panturrilha em Pé Smith c/ Step', sets: '4 × 10–15 (CGA)', note: '3" de descida' },
      ],
    },
    // Adicionado a pedido (não consta no PDF do treinador).
    forearm: [
      { name: 'Rosca de Punho com Halter (flexão)', sets: '3 × 12–15' },
      { name: 'Rosca de Punho Inversa (extensão)', sets: '3 × 12–15' },
    ],
  },

  mobility: {
    inferiores: [
      'https://youtube.com/shorts/1VEZyVIfp3M',
      'https://youtube.com/shorts/kd-gw6jUs1U',
      'https://youtube.com/shorts/jtCHPjiFLhE',
    ],
    superiores: [
      'https://youtube.com/shorts/4HEMgHDX9kM',
      'https://youtube.com/shorts/UxOBaWXFVY0',
    ],
  },

  diets: {
    cutting: {
      label: 'Cutting',
      treino: {
        label: 'Dia de Treino',
        meals: [
          { name: 'Refeição 1', items: ['100g Mamão OU Abacaxi', '30g Aveia', '20g Whey', '1 Ovo + 1 Clara', '1 ft Pão de Forma OU 30g Tapioca', '20g Mussarela'] },
          { name: 'Refeição 2', items: ['100g Arroz OU Macarrão', '150g Frango/Tilápia/Patinho (feito)', '60–80g Legumes', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 3', items: ['150g Frango/Tilápia/Patinho (feito)', '100g Legumes', '100g Morango', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 4 ou 5', items: ['200g Batata Inglesa (pesada crua)', '150g Frango/Tilápia/Patinho (feito)', '60–80g Legumes', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 5 ou 4', items: ['100g Mamão OU Abacaxi', '30g Aveia', '30g Whey', '80g Maçã', '10g Pasta de Amendoim', '100ml Leite/Iogurte desnatado'] },
        ],
      },
      descanso: {
        label: 'Dia de Descanso',
        meals: [
          { name: 'Refeição 1', items: ['100g Mamão OU Abacaxi', '30g Aveia', '20g Whey', '2 Ovos', '20g Mussarela'] },
          { name: 'Refeição 2', items: ['200g Batata Inglesa (pesada crua)', '170g Frango/Tilápia/Patinho (feito)', '60–80g Legumes', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 3', items: ['170g Frango/Tilápia/Patinho (feito)', '100g Legumes', '100g Morango', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 4 ou 5', items: ['150g Batata Inglesa (pesada crua)', '170g Frango/Tilápia/Patinho (feito)', '60–80g Legumes', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 5 ou 4', items: ['100g Mamão OU Abacaxi', '30g Aveia', '30g Whey', '80g Maçã', '20g Pasta de Amendoim', '100ml Leite/Iogurte desnatado'] },
        ],
      },
      guidance: {
        cardio: ['120 min/semana Bicicleta ou Esteira', '120 min/semana Escada'],
        supplements: ['7–10g Creatina', '1 × 500mg Ômega 3', '15g Glutamina', '1 cp Multivitamínico'],
        water: 'Água: 4,5 a 5L/dia', salt: 'Sal: 6–7g/dia',
      },
    },
    estabilizacao: {
      label: 'Estabilização',
      all: {
        label: 'Todos os dias',
        meals: [
          { name: 'Refeição 1', items: ['100g Mamão OU Abacaxi', '30g Aveia', '20g Whey', '1 Ovo + 1 Clara', '1 ft Pão de Forma OU 30g Tapioca', '20g Mussarela'] },
          { name: 'Refeição 2', items: ['100g Arroz OU Macarrão', '170g Frango/Tilápia/Patinho (feito)', '60–80g Legumes', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 3', items: ['170g Frango/Tilápia/Patinho (feito)', '100g Legumes', '100g Morango', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 4 ou 5', items: ['200g Batata Inglesa (pesada crua)', '170g Frango/Tilápia/Patinho (feito)', '60–80g Legumes', 'Salada / Refri ZERO à vontade'] },
          { name: 'Refeição 5 ou 4', items: ['100g Mamão OU Abacaxi', '30g Aveia', '30g Whey', '80g Maçã', '20g Pasta de Amendoim', '100ml Leite/Iogurte desnatado'] },
        ],
      },
      guidance: {
        cardio: ['120 min/semana Bicicleta ou Esteira', '60 min/semana Escada'],
        supplements: ['7–10g Creatina', '1 × 500mg Ômega 3', '15g Glutamina', '1 cp Multivitamínico'],
        water: 'Água: 4,5 a 5L/dia', salt: 'Sal: 6–7g/dia',
        freeMeal: 'Refeição livre: até 1900 kcal — 40g gordura · 150g carboidrato · 230g proteína',
      },
    },
  },
};
