// Demo blog data, part 1: categories, tags and the first five articles.
// Part 2 (more posts) lives in `seed-blog-content-more.ts`; the runner is
// `seed-demo-blog.ts`. Cover images use picsum.photos so no local files are
// needed and the demo works on any machine.

export type Translation = { title: string; excerpt: string; content: string }

export type DemoCategory = {
  name: string
  slug: string
  description: string
  translations: {
    es: { name: string; description: string }
    'pt-br': { name: string; description: string }
    ar: { name: string; description: string }
  }
}

export type DemoTag = {
  name: string
  slug: string
  translations: { es: string; 'pt-br': string; ar: string }
}

export type DemoPost = {
  slug: string
  title: string
  excerpt: string
  content: string
  coverImage: string
  coverAlt: string
  category: string
  featured: boolean
  viewCount: number
  /** Whole days ago the post went live. Negative means scheduled in the future. */
  publishedDaysAgo: number
  tags: string[]
  translations: Record<'es' | 'pt-br' | 'ar', Translation>
}

const cover = (id: number) => `https://picsum.photos/id/${id}/1200/675`

export const categories: DemoCategory[] = [
  {
    name: 'Guides',
    slug: 'guides',
    description: 'Step-by-step advice for growing a channel with unlock links.',
    translations: {
      es: {
        name: 'Guías',
        description: 'Consejos paso a paso para hacer crecer un canal con enlaces de desbloqueo.',
      },
      'pt-br': {
        name: 'Guias',
        description: 'Dicas passo a passo para crescer um canal com links de desbloqueio.',
      },
      ar: {
        name: 'أدلة',
        description: 'نصائح خطوة بخطوة لتنمية قناتك باستخدام روابط الفتح.',
      },
    },
  },
  {
    name: 'Growth',
    slug: 'growth',
    description: 'Building an audience that comes back on every platform.',
    translations: {
      es: {
        name: 'Crecimiento',
        description: 'Construir una audiencia que vuelve en todas las plataformas.',
      },
      'pt-br': {
        name: 'Crescimento',
        description: 'Construir uma audiência que volta em todas as plataformas.',
      },
      ar: {
        name: 'النمو',
        description: 'بناء جمهور يعود إليك على كل المنصات.',
      },
    },
  },
  {
    name: 'Monetization',
    slug: 'monetization',
    description: 'Turning attention into steady income without renting it out.',
    translations: {
      es: {
        name: 'Monetización',
        description: 'Convertir la atención en ingresos estables sin alquilarla.',
      },
      'pt-br': {
        name: 'Monetização',
        description: 'Transformar atenção em renda estável sem alugá-la.',
      },
      ar: {
        name: 'تحقيق الدخل',
        description: 'تحويل الانتباه إلى دخل ثابت دون استئجاره للغير.',
      },
    },
  },
  {
    name: 'Analytics',
    slug: 'analytics',
    description: 'Reading the few numbers that decide your next move.',
    translations: {
      es: {
        name: 'Analítica',
        description: 'Leer los pocos números que deciden tu próximo paso.',
      },
      'pt-br': {
        name: 'Análise',
        description: 'Ler os poucos números que decidem seu próximo passo.',
      },
      ar: {
        name: 'التحليلات',
        description: 'قراءة الأرقام القليلة التي تحدد خطوتك التالية.',
      },
    },
  },
]

export const tags: DemoTag[] = [
  {
    name: 'YouTube',
    slug: 'youtube',
    translations: { es: 'YouTube', 'pt-br': 'YouTube', ar: 'يوتيوب' },
  },
  {
    name: 'Audience growth',
    slug: 'audience-growth',
    translations: {
      es: 'Crecimiento de audiencia',
      'pt-br': 'Crescimento de audiência',
      ar: 'نمو الجمهور',
    },
  },
  {
    name: 'Monetization',
    slug: 'monetization',
    translations: { es: 'Monetización', 'pt-br': 'Monetização', ar: 'تحقيق الدخل' },
  },
  {
    name: 'Link in bio',
    slug: 'link-in-bio',
    translations: {
      es: 'Enlace en la bio',
      'pt-br': 'Link na bio',
      ar: 'رابط البايو',
    },
  },
  {
    name: 'Instagram',
    slug: 'instagram',
    translations: { es: 'Instagram', 'pt-br': 'Instagram', ar: 'إنستغرام' },
  },
  {
    name: 'TikTok',
    slug: 'tiktok',
    translations: { es: 'TikTok', 'pt-br': 'TikTok', ar: 'تيك توك' },
  },
  {
    name: 'Analytics',
    slug: 'analytics',
    translations: { es: 'Analítica', 'pt-br': 'Análise', ar: 'التحليلات' },
  },
  {
    name: 'Case study',
    slug: 'case-study',
    translations: { es: 'Caso de estudio', 'pt-br': 'Estudo de caso', ar: 'دراسة حالة' },
  },
  {
    name: 'Email list',
    slug: 'email-list',
    translations: { es: 'Lista de correo', 'pt-br': 'Lista de e-mail', ar: 'قائمة البريد' },
  },
]

export const posts: DemoPost[] = [
  {
    slug: 'grow-youtube-channel-with-unlock-links',
    title: 'How to grow a YouTube channel with unlock links',
    excerpt:
      'One link, one clear action and a reward the visitor understands before they start — the full playbook.',
    content: [
      '<p>Unlock links work best when they ask for something small and give something specific in return. A subscriber who joins your channel through a download page is more likely to stay than a subscriber who was asked for five different actions. This guide walks through the whole loop: choosing the action, writing the reward, placing the link and reading the numbers at the end.</p>',
      '<h2>Start where the attention already is</h2>',
      '<p>Your end screen and pinned comment are the two spots with the highest intent. A viewer who just finished the video is the cheapest subscriber you will ever get. Put the unlock link in both places and say out loud, in the last ten seconds, what clicking it gets them.</p>',
      '<h2>Pick one action per link</h2>',
      '<p>Choose the action that matters most for the video that carries the link. A tutorial about editing can ask for a subscribe; a track list can ask for a follow on Spotify. When a link asks for two things, the visitor does neither — decision fatigue is real even on a page with two buttons.</p>',
      '<h2>Make the reward obvious</h2>',
      '<p>Write the title as a promise: name the file, the template or the track. "Get the preset pack" converts better than "Unlock bonus content", because the visitor can picture the preset pack. If visitors cannot tell what they receive, the extra step feels like a toll instead of a trade.</p>',
      '<h3>Name it in the thumbnail era</h3>',
      '<p>Viewers skim. The reward should survive being read in three seconds on a cracked phone screen. Short noun, concrete outcome, no adjectives.</p>',
      '<h2>Write the description like a landing page</h2>',
      '<p>The first two lines of your description appear above the fold. Use them for the reward, not the chapter list. Something like: "Download the project files (1.2 GB) — takes one subscribe to unlock." Then let the chapters follow.</p>',
      '<h2>Measure the second step</h2>',
      '<p>Views tell you the link was opened; unlocks tell you the price was accepted. Compare both numbers on the dashboard every week. A link with 400 views and 12 unlocks is telling you the reward is weak or the ask is too heavy — change one of the two, never both at once.</p>',
      '<blockquote>Tip: reuse the same unlock link in the video description and the pinned comment so every mention points at a single source of truth. Two links to the same reward split your data in half.</blockquote>',
      '<h2>A weekly review loop that compounds</h2>',
      '<p>Every Monday, open the dashboard and sort by completion rate. Kill the bottom link, promote the top one into your newest video, and rewrite one reward headline. Ten minutes a week is the difference between a channel that grows and a channel that posts.</p>',
    ].join(''),
    coverImage: cover(1015),
    coverAlt: 'A river cutting through green mountains at sunrise',
    category: 'growth',
    featured: true,
    viewCount: 412,
    publishedDaysAgo: 21,
    tags: ['youtube', 'audience-growth'],
    translations: {
      es: {
        title: 'Cómo hacer crecer tu canal de YouTube con enlaces de desbloqueo',
        excerpt:
          'Un enlace, una acción clara y una recompensa que el visitante entiende antes de empezar: el método completo.',
        content: [
          '<p>Los enlaces de desbloqueo funcionan mejor cuando piden algo pequeño y devuelven algo concreto. Un suscriptor que llega desde una página de descarga suele quedarse más que uno al que se le pidieron cinco acciones distintas.</p>',
          '<h2>Empieza donde ya está la atención</h2>',
          '<p>La pantalla final y el comentario fijado son los dos puntos con mayor intención. Pon el enlace en ambos y di en voz alta, en los últimos diez segundos, qué obtiene quien lo pulse.</p>',
          '<h2>Una acción por enlace</h2>',
          '<p>Elige la acción que más importa para el vídeo que lleva el enlace. Un tutorial de edición puede pedir una suscripción; una lista de canciones, un seguimiento en Spotify. Cuando un enlace pide dos cosas, el visitante no hace ninguna.</p>',
          '<h2>Haz obvia la recompensa</h2>',
          '<p>Escribe el título como una promesa: nombra el archivo, la plantilla o la canción. "Descarga el paquete de presets" convierte mejor que "Desbloquea contenido extra".</p>',
          '<h2>Escribe la descripción como una landing</h2>',
          '<p>Las dos primeras líneas se ven sin expandir. Úsalas para la recompensa, no para los capítulos.</p>',
          '<h2>Mide el segundo paso</h2>',
          '<p>Las visitas indican que el enlace se abrió; los desbloqueos, que se aceptó el precio. Comparalos cada semana y cambia un solo elemento cada vez.</p>',
          '<h2>Un repaso semanal que acumula</h2>',
          '<p>Cada lunes, ordena por tasa de finalización. Elimina el enlace más débil, promociona el mejor en tu vídeo nuevo y reescribe un titular. Diez minutos por semana marcan la diferencia.</p>',
        ].join(''),
      },
      'pt-br': {
        title: 'Como crescer seu canal do YouTube com links de desbloqueio',
        excerpt:
          'Um link, uma ação clara e uma recompensa que o visitante entende antes de começar: o guia completo.',
        content: [
          '<p>Links de desbloqueio funcionam melhor quando pedem algo pequeno e entregam algo específico. Um inscrito que chega por uma página de download costuma ficar mais do que um que recebeu cinco pedidos diferentes.</p>',
          '<h2>Comece onde a atenção já está</h2>',
          '<p>A tela final e o comentário fixado são os dois pontos com maior intenção. Coloque o link nos dois e diga, nos últimos dez segundos, o que quem clicar recebe.</p>',
          '<h2>Uma ação por link</h2>',
          '<p>Escolha a ação mais importante para o vídeo que leva o link. Um tutorial de edição pode pedir inscrição; uma lista de músicas pode pedir follow no Spotify. Quando o link pede duas coisas, o visitante não faz nenhuma.</p>',
          '<h2>Deixe a recompensa óbvia</h2>',
          '<p>Escreva o título como uma promessa: diga o arquivo, o modelo ou a faixa. "Baixe o pacote de presets" converte mais que "Desbloqueie conteúdo extra".</p>',
          '<h2>Escreva a descrição como uma landing page</h2>',
          '<p>As duas primeiras linhas aparecem sem expandir. Use-as para a recompensa, não para os capítulos.</p>',
          '<h2>Meça o segundo passo</h2>',
          '<p>As visualizações mostram que o link foi aberto; os desbloqueios, que o preço foi aceito. Compare os dois toda semana e mude um elemento por vez.</p>',
          '<h2>Uma revisão semanal que acumula</h2>',
          '<p>Toda segunda, ordene por taxa de conclusão. Corte o link mais fraco, promova o melhor no vídeo novo e reescreva um título. Dez minutos por semana fazem a diferença.</p>',
        ].join(''),
      },
      ar: {
        title: 'كيف تنمّي قناتك على يوتيوب باستخدام روابط الفتح',
        excerpt: 'رابط واحد وخطوة واضحة ومكافأة يفهمها الزائر قبل أن يبدأ — الدليل الكامل.',
        content: [
          '<p>تعمل روابط الفتح بأفضل صورة عندما تطلب شيئًا صغيرًا وتقدّم شيئًا محددًا. المشترك الذي يصل من صفحة تنزيل يبقى عادة أكثر من الذي طُلب منه خمسة إجراءات مختلفة.</p>',
          '<h2>ابدأ حيث يوجد الانتباه أصلًا</h2>',
          '<p>شاشة النهاية والتعليق المثبّت هما أعلى نقطتين في الجدية. ضع الرابط فيهما وقل بصوت مسموع في آخر عشر ثوانٍ ما سيحصل عليه من ينقر.</p>',
          '<h2>إجراء واحد لكل رابط</h2>',
          '<p>اختر الإجراء الأهم للفيديو الذي يحمل الرابط. درس المونتاج يطلب الاشتراك، وقائمة المقاطع تطلب متابعة على سبوتيفاي. عندما يطلب الرابط شيئين لا يفعل الزائر أيًّا منهما.</p>',
          '<h2>اجعل المكافأة واضحة</h2>',
          '<p>اكتب العنوان كوعد: سمِّ الملف أو القالب أو المقطع. «نزّل حزمة الإعدادات الجاهزة» أفضل من «افتح محتوى إضافيًا».</p>',
          '<h2>اكتب الوصف كصفحة هبوط</h2>',
          '<p>السطران الأولان يظهران دون توسيع. استخدمهما للمكافأة لا لقائمة الفصول.</p>',
          '<h2>قِس الخطوة الثانية</h2>',
          '<p>المشاهدات تعني أن الرابط فُتح، والفتحات تعني أن الزائر قَبِل الشرط. قارن الرقمين أسبوعيًا وغيّر عنصرًا واحدًا كل مرة.</p>',
          '<h2>مراجعة أسبوعية تتراكم</h2>',
          '<p>كل اثنين رتّب حسب نسبة الإتمام. أوقف أضعف رابط، وانشر الأفضل في فيديوك الجديد، وأعد كتابة عنوان واحد. عشر دقائق أسبوعيًا تصنع الفرق.</p>',
        ].join(''),
      },
    },
  },
  {
    slug: 'unlock-steps-that-convert',
    title: 'Five unlock steps that actually convert',
    excerpt: 'Small phrasing and ordering changes that lift the share of visitors who finish your link.',
    content: [
      '<p>A link is finished when the visitor reaches the destination, not when they click the first step. Most drop-off happens between intention and completion, and it is usually caused by friction you can remove in an afternoon. These five habits keep the completion rate high.</p>',
      '<h2>1. Show the steps before the visitor starts</h2>',
      '<p>List what will be asked. Surprises read as obstacles; a visible checklist reads as a short path. Three steps shown upfront convert better than two hidden ones, because the visitor can budget their attention before spending it.</p>',
      '<h2>2. Keep one click per step</h2>',
      '<p>Redirects that need a second tap lose people on slow connections. Every step should open the right page directly — no interstitials, no "continue" screens. If a platform forces an extra hop, say so on the step card so the visitor is not surprised.</p>',
      '<h2>3. Name the real account</h2>',
      '<p>Write the channel, profile or playlist the action belongs to. Visitors trust a named destination more than a generic prompt, and it protects you from the classic mistake of growing the wrong account by accident.</p>',
      '<h2>4. Put the strongest action first</h2>',
      '<p>The first step gets the most attention and the highest completion. Reserve it for the action you value most, then keep the rest short. A subscribe first and a quick follow second outperforms the reverse order almost every time we test it.</p>',
      '<h2>5. Count unlocks, not only views</h2>',
      '<p>A high view count with a low completion rate means the promise and the reward do not match. Change one element at a time — the headline, the reward, the first step — and compare against last week. Two changes at once and you learn nothing.</p>',
      '<blockquote>Rule of thumb: if you cannot explain a step in five words, the visitor cannot decide to do it in five seconds.</blockquote>',
      '<h2>A quick pre-flight checklist</h2>',
      '<p>Before publishing a link, open it on your own phone over mobile data. Check that every step opens in one tap, the reward name is visible without scrolling, and the destination account is the one you meant. Sixty seconds of checking beats a week of wondering why the numbers are flat.</p>',
    ].join(''),
    coverImage: cover(1016),
    coverAlt: 'A wide canyon under an open sky',
    category: 'guides',
    featured: false,
    viewCount: 305,
    publishedDaysAgo: 14,
    tags: ['audience-growth'],
    translations: {
      es: {
        title: 'Cinco pasos de desbloqueo que sí convierten',
        excerpt:
          'Cambios pequeños de redacción y de orden que aumentan quienes terminan tu enlace.',
        content: [
          '<p>Un enlace termina cuando el visitante llega al destino, no cuando pulsa el primer paso. Casi toda la pérdida ocurre entre la intención y la finalización, y suele deberse a fricción que puedes quitar en una tarde.</p>',
          '<h2>1. Muestra los pasos antes de empezar</h2>',
          '<p>Enumera lo que se va a pedir. Las sorpresas se leen como obstáculos; una lista visible se lee como un camino corto.</p>',
          '<h2>2. Un clic por paso</h2>',
          '<p>Cada paso debe abrir la página correcta directamente, sin pantallas intermedias. Si una plataforma obliga a un salto extra, avísalo en la tarjeta.</p>',
          '<h2>3. Nombra la cuenta real</h2>',
          '<p>Escribe el canal o perfil al que pertenece la acción. El visitante confía más en un destino con nombre.</p>',
          '<h2>4. Pon primero la acción más fuerte</h2>',
          '<p>El primer paso tiene la mayor atención y finalización. Resérvalo para la acción que más valoras.</p>',
          '<h2>5. Cuenta desbloqueos, no solo visitas</h2>',
          '<p>Muchas visitas con poca finalización significan que la promesa y la recompensa no encajan. Cambia un elemento cada vez y compara.</p>',
          '<h2>Lista de comprobación antes de publicar</h2>',
          '<p>Abre el enlace en tu propio teléfono con datos móviles: cada paso en un toque, recompensa visible sin desplazar y cuenta correcta.</p>',
        ].join(''),
      },
      'pt-br': {
        title: 'Cinco etapas de desbloqueio que realmente convertem',
        excerpt:
          'Pequenas mudanças de texto e de ordem que aumentam quem conclui seu link.',
        content: [
          '<p>Um link termina quando o visitante chega ao destino, não quando clica na primeira etapa. Quase toda a perda acontece entre a intenção e a conclusão, por atrito que você remove em uma tarde.</p>',
          '<h2>1. Mostre as etapas antes de começar</h2>',
          '<p>Liste o que será pedido. Surpresas parecem obstáculos; uma lista visível parece um caminho curto.</p>',
          '<h2>2. Um clique por etapa</h2>',
          '<p>Cada etapa deve abrir a página certa direto, sem telas intermediárias. Se a plataforma força um salto extra, avise no cartão.</p>',
          '<h2>3. Nomeie a conta real</h2>',
          '<p>Escreva o canal ou perfil da ação. O visitante confia mais em um destino nomeado.</p>',
          '<h2>4. Coloque a ação mais forte primeiro</h2>',
          '<p>A primeira etapa tem mais atenção e conclusão. Reserve-a para o que você mais valoriza.</p>',
          '<h2>5. Conte desbloqueios, não só visualizações</h2>',
          '<p>Muitas visualizações com pouca conclusão significam promessa e recompensa desalinhadas. Mude um elemento por vez.</p>',
          '<h2>Checklist antes de publicar</h2>',
          '<p>Abra o link no seu celular com dados móveis: cada etapa em um toque, recompensa visível sem rolar e conta correta.</p>',
        ].join(''),
      },
      ar: {
        title: 'خمس خطوات فتح تحقق نتائج فعلية',
        excerpt: 'تعديلات صغيرة في الصياغة والترتيب ترفع نسبة الزوار الذين يكملون رابطك.',
        content: [
          '<p>ينتهي الرابط عندما يصل الزائر إلى الوجهة، لا عندما ينقر الخطوة الأولى. معظم التسرب يحدث بين النية والإتمام، وسببه عادة احتكاك يمكنك إزالته في جلسة واحدة.</p>',
          '<h2>1. اعرض الخطوات قبل البدء</h2>',
          '<p>اذكر ما سيُطلب. المفاجآت تُقرأ كعقبات، والقائمة الظاهرة تُقرأ كطريق قصير.</p>',
          '<h2>2. نقرة واحدة لكل خطوة</h2>',
          '<p>كل خطوة يجب أن تفتح الصفحة الصحيحة مباشرة دون شاشات وسيطة. إذا فرضت المنصة قفزة إضافية فاذكر ذلك في البطاقة.</p>',
          '<h2>3. سمِّ الحساب الحقيقي</h2>',
          '<p>اكتب القناة أو الملف الذي يخصه الإجراء. يثق الزائر بهدف مسمّى أكثر.</p>',
          '<h2>4. ضع أقوى إجراء أولًا</h2>',
          '<p>الخطوة الأولى تحصل على أكبر انتباه وأعلى إتمام. خصصها للإجراء الأهم.</p>',
          '<h2>5. عُدّ الفتحات لا المشاهدات فقط</h2>',
          '<p>مشاهدات كثيرة مع إتمام قليل تعني أن الوعد والمكافأة لا يتطابقان. غيّر عنصرًا واحدًا كل مرة وقارن.</p>',
          '<h2>قائمة تحقق قبل النشر</h2>',
          '<p>افتح الرابط على هاتفك عبر بيانات الجوال: كل خطوة بنقرة، والمكافأة ظاهرة دون تمرير، والحساب صحيح.</p>',
        ].join(''),
      },
    },
  },
  {
    slug: 'turn-one-link-into-a-bio-page',
    title: 'Turn one link into a bio page that sells',
    excerpt: 'Group your links by intent so visitors reach the offer instead of scrolling past it.',
    content: [
      '<p>A single unlock link is easy to share, but an audience usually wants more than one destination. A bio page keeps every option behind one address while each card keeps its own unlock steps. The difference between a page that sells and a page that scrolls is ordering: visitors buy when the first thing they see matches why they arrived.</p>',
      '<h2>Order the page by intent</h2>',
      '<p>Start with the offer that earns. Put free resources next, and keep social accounts last so they do not compete with the main action. A visitor who came for the preset should meet the preset above the fold — not your TikTok.</p>',
      '<h2>Keep one primary button</h2>',
      '<p>Use the accent colour on a single card. When every link looks primary, none of them reads as the next step. The rest of the page can share the same quiet style; hierarchy is what makes the page feel designed rather than stacked.</p>',
      '<h2>Let the theme match the brand</h2>',
      '<p>Pick a theme that shares the colour of your channel artwork, then change only the accent. Consistency makes a short page feel finished, and a finished page reads as trustworthy — the visitor subconsciously assumes the product behind it is finished too.</p>',
      '<h2>Add proof between the links</h2>',
      '<p>A one-line testimonial between the offer and the free resources lifts clicks on both. Keep it specific: "Cut my editing time in half" beats "Amazing creator". If you do not have quotes yet, a subscriber count or a play total works — numbers are proof too.</p>',
      '<h2>Check it on a phone, monthly</h2>',
      '<p>Most visitors arrive from a mobile app. Open the page on your own phone once a month and follow the same path they do: read the first card, tap the primary button, finish one unlock. Anything that annoys you in that minute is costing you money.</p>',
      '<blockquote>A bio page is not a directory of everything you do. It is a three-second pitch with a button under it.</blockquote>',
    ].join(''),
    coverImage: cover(1018),
    coverAlt: 'Still lake between mountain slopes',
    category: 'monetization',
    featured: false,
    viewCount: 268,
    publishedDaysAgo: 10,
    tags: ['link-in-bio', 'monetization'],
    translations: {
      es: {
        title: 'Convierte un solo enlace en una página de bio que vende',
        excerpt:
          'Agrupa tus enlaces por intención para que el visitante llegue a la oferta sin perderse.',
        content: [
          '<p>Un enlace de desbloqueo es fácil de compartir, pero la audiencia suele querer más de un destino. Una página de bio reúne todas las opciones en una dirección, y el orden decide si vende o solo se desplaza.</p>',
          '<h2>Ordena la página por intención</h2>',
          '<p>Empieza por la oferta que genera ingresos, luego los recursos gratuitos y las redes al final.</p>',
          '<h2>Un solo botón principal</h2>',
          '<p>Usa el color de acento en una única tarjeta. Cuando todo parece principal, nada se lee como el siguiente paso.</p>',
          '<h2>Que el tema coincida con la marca</h2>',
          '<p>Elige un tema con el color de tu arte de canal y cambia solo el acento. La coherencia se lee como confianza.</p>',
          '<h2>Añade prueba entre los enlaces</h2>',
          '<p>Una testimonio de una línea entre la oferta y los recursos sube los clics en ambos. Sé específico: los números también son prueba.</p>',
          '<h2>Revísala en el teléfono cada mes</h2>',
          '<p>La mayoría llega desde una app móvil. Recorre el mismo camino que ellos y arregla lo que te moleste.</p>',
        ].join(''),
      },
      'pt-br': {
        title: 'Transforme um único link em uma bio page que vende',
        excerpt:
          'Agrupe seus links por intenção para o visitante chegar à oferta sem se perder.',
        content: [
          '<p>Um link de desbloqueio é fácil de compartilhar, mas a audiência costuma querer mais de um destino. A bio page reúne tudo em um endereço, e a ordem decide se vende ou só rola.</p>',
          '<h2>Ordene a página por intenção</h2>',
          '<p>Comece pela oferta que gera receita, depois os recursos gratuitos e as redes no fim.</p>',
          '<h2>Um único botão principal</h2>',
          '<p>Use a cor de destaque em um só cartão. Quando tudo parece principal, nada é o próximo passo.</p>',
          '<h2>Combine o tema com a marca</h2>',
          '<p>Escolha um tema com a cor da arte do canal e mude apenas o destaque. Consistência lê-se como confiança.</p>',
          '<h2>Adicione prova entre os links</h2>',
          '<p>Um depoimento de uma linha entre a oferta e os recursos aumenta os cliques nos dois. Números também são prova.</p>',
          '<h2>Confira no celular todo mês</h2>',
          '<p>A maioria chega por um app. Siga o mesmo caminho do visitante e corrija o que irritar.</p>',
        ].join(''),
      },
      ar: {
        title: 'حوّل رابطًا واحدًا إلى صفحة بايو تبيع',
        excerpt: 'جمّع روابطك حسب الهدف ليصل الزائر إلى العرض بدل أن يمرّ عليه.',
        content: [
          '<p>رابط فتح واحد سهل المشاركة، لكن الجمهور غالبًا يريد أكثر من وجهة. صفحة البايو تجمع الخيارات في عنوان واحد، والترتيب هو ما يفرق بين صفحة تبيع وصفحة تُمرَّر فقط.</p>',
          '<h2>رتّب الصفحة حسب الهدف</h2>',
          '<p>ابدأ بالعرض الذي يحقق الدخل، ثم الموارد المجانية، واجعل حسابات التواصل آخرًا.</p>',
          '<h2>زر رئيسي واحد</h2>',
          '<p>استخدم لون التمييز في بطاقة واحدة. عندما تبدو كل الروابط رئيسية لا يُقرأ أي منها كخطوة تالية.</p>',
          '<h2>اجعل الثيم مطابقًا للعلامة</h2>',
          '<p>اختر ثيمًا بألوان غلاف قناتك وغيّر التمييز فقط. الاتساق يُقرأ كثقة.</p>',
          '<h2>أضف إثباتًا بين الروابط</h2>',
          '<p>سطر شهادة واحد بين العرض والموارد يرفع النقرات عليهما. كن محددًا: الأرقام إثبات أيضًا.</p>',
          '<h2>راجعها على الهاتف شهريًا</h2>',
          '<p>معظم الزوار يصلون من تطبيق. اتبع طريقهم نفسه وأصلح ما يزعجك.</p>',
        ].join(''),
      },
    },
  },
  {
    slug: 'bio-page-blocks-that-convert',
    title: 'The seven blocks every high-converting bio page needs',
    excerpt: 'A block-by-block anatomy of the page top creators use, from headline to footer.',
    content: [
      '<p>Most bio pages fail for the same reason: they are a pile of links instead of a page. High-converting pages — the ones that turn a profile visit into a subscribe, a download or a sale — are built from the same seven blocks. You do not need all seven on day one, but every block you add should earn its scroll.</p>',
      '<h2>1. A headline that names the audience</h2>',
      '<p>"Editing presets for fitness creators" tells the right visitor they are in the right place in one line. A logo alone cannot do that. Write the headline for the person you want, not for yourself.</p>',
      '<h2>2. One primary offer card</h2>',
      '<p>The single thing you want a first-time visitor to do. Accent colour, one sentence, one button. Everything else on the page is secondary by design.</p>',
      '<h2>3. Social proof strip</h2>',
      '<p>A compact row: follower counts, plays, a one-line quote. It answers the question every new visitor silently asks — "is this worth my click?" — before they ask it.</p>',
      '<h2>4. Free value with an unlock</h2>',
      '<p>One or two genuinely free resources behind a light unlock step. This is where a stranger becomes a subscriber: they got value first, so the ask feels fair.</p>',
      '<h2>5. Content links, grouped</h2>',
      '<p>Latest video, best series, podcast — grouped and labelled, never dumped. Three labelled groups beat twelve identical buttons, because labels let the visitor self-select.</p>',
      '<h2>6. Contact or business card</h2>',
      '<p>A single line for sponsors and clients: an email or a contact link. It signals professionalism and it costs one row.</p>',
      '<h2>7. A quiet footer</h2>',
      '<p>Legal links, language hint, copyright. Unremarkable, but its absence makes a page look unfinished — and unfinished pages convert like unfinished pages.</p>',
      '<blockquote>Test: screenshot your page, blur it, and ask a stranger which card they would tap. If they hesitate, your hierarchy is broken, not your copy.</blockquote>',
    ].join(''),
    coverImage: cover(1019),
    coverAlt: 'Rocky coastline with waves against the light',
    category: 'guides',
    featured: false,
    viewCount: 190,
    publishedDaysAgo: 7,
    tags: ['link-in-bio', 'audience-growth'],
    translations: {
      es: {
        title: 'Los siete bloques de una página de bio que convierte',
        excerpt: 'La anatomía bloque a bloque de la página que usan los mejores creadores.',
        content: [
          '<p>La mayoría de las bios fallan por lo mismo: son un montón de enlaces y no una página. Las páginas que convierten se construyen con los mismos siete bloques.</p>',
          '<h2>1. Un titular que nombre a la audiencia</h2>',
          '<p>"Presets de edición para creadores de fitness" dice al visitante correcto que está en el lugar correcto.</p>',
          '<h2>2. Una tarjeta de oferta principal</h2>',
          '<p>Lo único que quieres que haga un visitante nuevo: color de acento, una frase, un botón.</p>',
          '<h2>3. Franja de prueba social</h2>',
          '<p>Números y una cita breve. Responde la pregunta silenciosa: "¿vale mi clic?"</p>',
          '<h2>4. Valor gratis con desbloqueo</h2>',
          '<p>Uno o dos recursos gratuitos tras un paso ligero. Aquí el extraño se vuelve suscriptor.</p>',
          '<h2>5. Enlaces de contenido agrupados</h2>',
          '<p>Vídeo reciente, mejor serie, podcast: agrupados y etiquetados, nunca amontonados.</p>',
          '<h2>6. Tarjeta de contacto</h2>',
          '<p>Una línea para patrocinadores y clientes: email o enlace de contacto.</p>',
          '<h2>7. Un pie discreto</h2>',
          '<p>Enlaces legales y copyright. Poco llamativo, pero su ausencia hace que la página parezca inacabada.</p>',
        ].join(''),
      },
      'pt-br': {
        title: 'Os sete blocos de uma bio page que converte',
        excerpt: 'A anatomia bloco a bloco da página que os melhores criadores usam.',
        content: [
          '<p>A maioria das bios falha pelo mesmo motivo: é um monte de links, não uma página. As páginas que convertem usam os mesmos sete blocos.</p>',
          '<h2>1. Um título que nomeie a audiência</h2>',
          '<p>"Presets de edição para criadores de fitness" diz ao visitante certo que ele chegou ao lugar certo.</p>',
          '<h2>2. Um cartão de oferta principal</h2>',
          '<p>A única ação desejada de um visitante novo: cor de destaque, uma frase, um botão.</p>',
          '<h2>3. Faixa de prova social</h2>',
          '<p>Números e uma citação curta. Responde à pergunta silenciosa: "vale meu clique?"</p>',
          '<h2>4. Valor grátis com desbloqueio</h2>',
          '<p>Um ou dois recursos gratuitos atrás de uma etapa leve. Aqui o estranho vira inscrito.</p>',
          '<h2>5. Links de conteúdo agrupados</h2>',
          '<p>Vídeo recente, melhor série, podcast: agrupados e rotulados, nunca empilhados.</p>',
          '<h2>6. Cartão de contato</h2>',
          '<p>Uma linha para patrocinadores e clientes: e-mail ou link de contato.</p>',
          '<h2>7. Um rodapé discreto</h2>',
          '<p>Links legais e copyright. Sem brilho, mas a ausência faz a página parecer inacabada.</p>',
        ].join(''),
      },
      ar: {
        title: 'الكتل السبع التي تحتاجها كل صفحة بايو ناجحة',
        excerpt: 'تشريح كتلةً كتلةً للصفحة التي يستخدمها أفضل صنّاع المحتوى.',
        content: [
          '<p>معظم صفحات البايو تفشل للسبب نفسه: إنها كومة روابط لا صفحة. الصفحات التي تحقق نتائج تُبنى من الكتل السبع نفسها.</p>',
          '<h2>1. عنوان يسمّي الجمهور</h2>',
          '<p>«إعدادات مونتاج لصنّاع محتوى اللياقة» تخبر الزائر الصحيح أنه في المكان الصحيح.</p>',
          '<h2>2. بطاقة عرض رئيسية واحدة</h2>',
          '<p>الإجراء الوحيد الذي تريده من زائر جديد: لون مميز وجملة وزر.</p>',
          '<h2>3. شريط إثبات اجتماعي</h2>',
          '<p>أرقام واقتباس قصير يجيب عن سؤال الزائر الصامت: «هل يستحق نقرتي؟»</p>',
          '<h2>4. قيمة مجانية مع فتح</h2>',
          '<p>مورد أو موردان مجانيان خلف خطوة خفيفة. هنا يتحول الغريب إلى مشترك.</p>',
          '<h2>5. روابط محتوى مجمّعة</h2>',
          '<p>أحدث فيديو وأفضل سلسلة وبودكاست: مجموعات معنونة لا أزرار متراكمة.</p>',
          '<h2>6. بطاقة تواصل</h2>',
          '<p>سطر واحد للرعاة والعملاء: بريد أو رابط تواصل.</p>',
          '<h2>7. تذييل هادئ</h2>',
          '<p>روابط قانونية وحقوق النشر. وجوده عادي لكن غيابه يجعل الصفحة تبدو غير مكتملة.</p>',
        ].join(''),
      },
    },
  },
  {
    slug: 'instagram-link-in-bio-strategy',
    title: 'An Instagram link-in-bio strategy that survives algorithm changes',
    excerpt: 'Stop chasing the feed. Build a link system that works no matter what Instagram ranks.',
    content: [
      '<p>Every year Instagram changes what it shows and every year the same creators keep growing anyway. The difference is not luck: they stopped depending on reach and started converting the reach they already get. Your bio link is the one asset on the platform you fully control — treat it like a product, not a footnote.</p>',
      '<h2>The bio link is a product with one job</h2>',
      '<p>Decide the single conversion that matters this quarter: follows, a lead magnet, a shop visit. The page behind your link should be redesigned around that one job, and everything else is support. When the job changes, the page changes — that is the strategy.</p>',
      '<h2>Match the link to the story</h2>',
      '<p>A Reel about "my editing workflow" and a carousel about "pricing your first product" attract different intents. If both send people to the same generic page, half the visitors meet the wrong first card. Group your content into two or three themes and give each theme its own destination on the page, ordered by what is trending this week.</p>',
      '<h2>Use the profile as a landing page</h2>',
      '<p>Name, category and the first line of the bio do more work than the link itself. State who the page is for and what they get. "Presets and templates for travel editors" filters and qualifies before the first tap.</p>',
      '<h2>Stories carry the link, the grid carries the promise</h2>',
      '<p>Puts the link in Stories with a sticker whenever it is contextually relevant — Story traffic converts several times better than bio traffic because the intent is fresh. The grid post tells the story; the Story closes it.</p>',
      '<h2>Measure weekly, redesign monthly</h2>',
      '<p>Watch three numbers: link taps from the profile, completion rate on the unlock steps, and where the drop happens. Redesign the page once a month based on that, not on opinion. Creators who redesign on data grow through algorithm changes; creators who redesign on vibes restart every quarter.</p>',
      '<blockquote>The algorithm decides who sees you. Your link decides what they do next. Only one of those is under your control.</blockquote>',
    ].join(''),
    coverImage: cover(1024),
    coverAlt: 'A bird flying over open water',
    category: 'growth',
    featured: false,
    viewCount: 240,
    publishedDaysAgo: 5,
    tags: ['instagram', 'link-in-bio'],
    translations: {
      es: {
        title: 'Una estrategia de enlace en la bio que sobrevive al algoritmo',
        excerpt:
          'Deja de perseguir el feed: construye un sistema de enlaces que funcione cambie lo que cambie Instagram.',
        content: [
          '<p>Cada año Instagram cambia lo que muestra, y cada año los mismos creadores siguen creciendo. Dejaron de depender del alcance y empezaron a convertir el que ya tienen. Tu enlace de bio es el único activo que controlas del todo: trátalo como un producto.</p>',
          '<h2>El enlace es un producto con un trabajo</h2>',
          '<p>Decide la única conversión que importa este trimestre y rediseña la página en torno a ella.</p>',
          '<h2>Casa el enlace con la historia</h2>',
          '<p>Un Reel de flujo de trabajo y un carrusel de precios atraen intenciones distintas. Agrupa tu contenido en dos o tres temas y da a cada uno su destino en la página.</p>',
          '<h2>Usa el perfil como landing</h2>',
          '<p>Nombre, categoría y primera línea hacen más trabajo que el enlace: di para quién es la página y qué recibe.</p>',
          '<h2>Las Stories llevan el enlace; el grid, la promesa</h2>',
          '<p>El tráfico de Stories convierte varias veces más que el de la bio porque la intención está fresca.</p>',
          '<h2>Mide semanal, rediseña mensual</h2>',
          '<p>Vigila toques, finalización y punto de caída. Rediseña con datos y crecerás a través de cualquier cambio del algoritmo.</p>',
        ].join(''),
      },
      'pt-br': {
        title: 'Uma estratégia de link na bio que sobrevive ao algoritmo',
        excerpt:
          'Pare de correr atrás do feed: construa um sistema de links que funciona não importa o que o Instagram ranqueie.',
        content: [
          '<p>Todo ano o Instagram muda o que mostra, e todo ano os mesmos criadores continuam crescendo. Eles pararam de depender do alcance e passaram a converter o que já têm. Seu link da bio é o único ativo totalmente sob seu controle: trate-o como produto.</p>',
          '<h2>O link é um produto com um trabalho</h2>',
          '<p>Decida a única conversão que importa neste trimestre e redesenhe a página em torno dela.</p>',
          '<h2>Casa o link com a história</h2>',
          '<p>Um Reel de workflow e um carrossel de preços atraem intenções diferentes. Agrupe o conteúdo em dois ou três temas e dê a cada um seu destino na página.</p>',
          '<h2>Use o perfil como landing</h2>',
          '<p>Nome, categoria e primeira linha trabalham mais que o link: diga para quem é a página e o que a pessoa recebe.</p>',
          '<h2>Os Stories levam o link; o grid leva a promessa</h2>',
          '<p>O tráfego de Stories converte várias vezes mais que o da bio, porque a intenção está fresca.</p>',
          '<h2>Meça semanal, redesenhe mensal</h2>',
          '<p>Acompanhe toques, conclusão e onde cai a audiência. Redesenhe com dados e você cresce através de qualquer mudança de algoritmo.</p>',
        ].join(''),
      },
      ar: {
        title: 'استراتيجية رابط البايو في إنستغرام تصمد أمام تغييرات الخوارزمية',
        excerpt: 'توقف عن مطاردة الخلاصة وابنِ نظام روابط يعمل مهما رتّب إنستغرام المحتوى.',
        content: [
          '<p>كل عام يغيّر إنستغرام ما يعرضه، وكل عام يستمر صنّاع المحتوى أنفسهم في النمو. الفرق أنهم توقفوا عن الاعتماد على الوصول وبدأوا بتحويل ما يصلون إليه فعلًا. رابط البايو هو الأصل الوحيد الذي تتحكم به بالكامل: عامله كمنتج.</p>',
          '<h2>الرابط منتج له مهمة واحدة</h2>',
          '<p>حدد التحويل الوحيد المهم هذا الربع وأعد تصميم الصفحة حوله.</p>',
          '<h2>طابق الرابط مع القصة</h2>',
          '<p>ريل عن سير العمل ومنشور ألبوم عن التسعير يجذبان نيتين مختلفتين. جمّع محتواك في موضوعين أو ثلاثة وأعطِ كل موضوع وجهته على الصفحة.</p>',
          '<h2>اجعل الملف الشخصي صفحة هبوط</h2>',
          '<p>الاسم والفئة والسطر الأول تعمل أكثر من الرابط: قل لمن الصفحة وماذا سيحصل.</p>',
          '<h2>الستوري يحمل الرابط والشبكة تحمل الوعد</h2>',
          '<p>زيارات الستوري تحوّل أكثر من زيارات البايو لأن النية حديثة.</p>',
          '<h2>قِس أسبوعيًا وأعد التصميم شهريًا</h2>',
          '<p>راقب النقرات ونسبة الإتمام وموضع التسرب، وأعد التصميم بناءً على البيانات لا الانطباعات.</p>',
        ].join(''),
      },
    },
  },
]
