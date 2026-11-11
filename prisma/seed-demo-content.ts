import 'dotenv/config'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'

import { PrismaClient } from '../src/generated/prisma/client'

/**
 * Demo data for the custom sidebar menus feature: a "Guides" group with two
 * published, fully translated pages. Safe to re-run - existing pages and menu
 * rows are left untouched, so edits made in the admin builder survive.
 *
 * Set OGADS_REFERRAL_URL to your own referral link; without it the guide links
 * to the OGAds homepage.
 */
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set')
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1'])

/** Remote hosts (cloud MySQL such as TiDB) require TLS; local stays plain. */
function adapterOptions(url: string) {
  const parsed = new URL(url)
  if (LOCAL_HOSTS.has(parsed.hostname)) return url
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 3306),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
    ssl: {},
    connectTimeout: 15000,
  }
}

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(adapterOptions(connectionString)) })

const referralUrl = (process.env.OGADS_REFERRAL_URL?.trim() || 'https://ogads.com').replace(
  /&/g,
  '&amp;',
)

type DemoPage = {
  slug: string
  title: string
  excerpt: string
  content: string
  translations: Record<'es' | 'pt-br' | 'ar', { title: string; excerpt: string; content: string }>
}

const demoPages: DemoPage[] = [
  {
    slug: 'social-video-downloader',
    title: 'Add a social video downloader tool',
    excerpt:
      'Turn any YouTube, TikTok or Instagram link into a new tool your visitors unlock in a few clicks.',
    content: [
      '<h2>What you will build</h2>',
      '<p>A social video downloader is a normal unlock link whose destination is a downloader service. Visitors complete your unlock steps, then receive the download page for the video they asked for.</p>',
      '<h2>Step by step</h2>',
      '<ol>',
      '<li><strong>Open your dashboard</strong> and select <a href="/dashboard/links/new">Create link</a>.</li>',
      '<li><strong>Fill in the link details.</strong> Use a specific title such as “Download TikTok videos without a watermark” and paste the downloader page as the <strong>Link destination</strong>.</li>',
      '<li><strong>Add the unlock steps.</strong> Select <strong>Add action</strong>, choose the platform you want to grow and the matching action: follow, subscribe or like.</li>',
      '<li><strong>Keep it short.</strong> One click per step is enough. Visitors should understand what they get before they start.</li>',
      '<li><strong>Create the link</strong> and copy the public URL from the success dialog.</li>',
      '<li><strong>Share it where your audience is</strong>: bio page, video description, pinned comment or a story.</li>',
      '</ol>',
      '<blockquote>Tip: publish one downloader per platform instead of a generic “video downloader”. Visitors recognise the platform they already use and complete more links.</blockquote>',
      '<h2>Checklist before you share</h2>',
      '<ul>',
      '<li>The destination opens without a login wall.</li>',
      '<li>The title names the platform and the file type.</li>',
      '<li>Every step points at a real profile, video or server.</li>',
      '<li>You tested the link once on a phone.</li>',
      '</ul>',
    ].join(''),
    translations: {
      es: {
        title: 'Añade una herramienta de descarga de vídeo social',
        excerpt:
          'Convierte cualquier enlace de YouTube, TikTok o Instagram en una herramienta que tus visitantes desbloquean en unos clics.',
        content: [
          '<h2>Qué vas a crear</h2>',
          '<p>Un descargador de vídeo social es un enlace de desbloqueo normal cuyo destino es un servicio de descarga. Los visitantes completan tus pasos y reciben la página de descarga del vídeo que buscan.</p>',
          '<h2>Paso a paso</h2>',
          '<ol>',
          '<li><strong>Abre tu panel</strong> y selecciona <a href="/dashboard/links/new">Crear enlace</a>.</li>',
          '<li><strong>Completa los detalles del enlace.</strong> Usa un título concreto, por ejemplo «Descarga vídeos de TikTok sin marca de agua», y pega la página del descargador como <strong>Destino del enlace</strong>.</li>',
          '<li><strong>Añade los pasos de desbloqueo.</strong> Selecciona <strong>Añadir acción</strong>, elige la plataforma que quieres hacer crecer y la acción correspondiente: seguir, suscribirse o dar me gusta.</li>',
          '<li><strong>Mantén los pasos cortos.</strong> Con un clic por paso es suficiente. Los visitantes deben entender qué reciben antes de empezar.</li>',
          '<li><strong>Crea el enlace</strong> y copia la URL pública del cuadro de confirmación.</li>',
          '<li><strong>Compártelo donde está tu público</strong>: biografía, descripción del vídeo, comentario fijado o una historia.</li>',
          '</ol>',
          '<blockquote>Consejo: publica un descargador por plataforma en lugar de un «descargador de vídeo» genérico. Los visitantes reconocen la plataforma que ya usan y completan más enlaces.</blockquote>',
          '<h2>Lista de comprobación antes de compartir</h2>',
          '<ul>',
          '<li>El destino se abre sin pedir inicio de sesión.</li>',
          '<li>El título indica la plataforma y el tipo de archivo.</li>',
          '<li>Cada paso apunta a un perfil, vídeo o servidor real.</li>',
          '<li>Has probado el enlace una vez desde el móvil.</li>',
          '</ul>',
        ].join(''),
      },
      'pt-br': {
        title: 'Adicione uma ferramenta de download de vídeo social',
        excerpt:
          'Transforme qualquer link do YouTube, TikTok ou Instagram em uma ferramenta que seus visitantes desbloqueiam em poucos cliques.',
        content: [
          '<h2>O que você vai criar</h2>',
          '<p>Um baixador de vídeo social é um link de desbloqueio comum cujo destino é um serviço de download. O visitante conclui as suas etapas e recebe a página de download do vídeo que procura.</p>',
          '<h2>Passo a passo</h2>',
          '<ol>',
          '<li><strong>Abra o seu painel</strong> e selecione <a href="/dashboard/links/new">Criar link</a>.</li>',
          '<li><strong>Preencha os detalhes do link.</strong> Use um título específico, como «Baixe vídeos do TikTok sem marca d’água», e cole a página do serviço de download como <strong>Destino do link</strong>.</li>',
          '<li><strong>Adicione as etapas de desbloqueio.</strong> Selecione <strong>Adicionar ação</strong>, escolha a plataforma que você quer crescer e a ação correspondente: seguir, se inscrever ou curtir.</li>',
          '<li><strong>Mantenha as etapas curtas.</strong> Um clique por etapa já basta. O visitante precisa entender o que vai receber antes de começar.</li>',
          '<li><strong>Crie o link</strong> e copie a URL pública na janela de confirmação.</li>',
          '<li><strong>Compartilhe onde está o seu público</strong>: bio, descrição do vídeo, comentário fixado ou story.</li>',
          '</ol>',
          '<blockquote>Dica: publique um baixador por plataforma em vez de um «baixador de vídeo» genérico. O visitante reconhece a plataforma que já usa e conclui mais links.</blockquote>',
          '<h2>Checklist antes de compartilhar</h2>',
          '<ul>',
          '<li>O destino abre sem exigir login.</li>',
          '<li>O título indica a plataforma e o tipo de arquivo.</li>',
          '<li>Cada etapa aponta para um perfil, vídeo ou servidor real.</li>',
          '<li>Você testou o link uma vez no celular.</li>',
          '</ul>',
        ].join(''),
      },
      ar: {
        title: 'أضف أداة لتنزيل الفيديو من وسائل التواصل',
        excerpt: 'حوّل أي رابط من يوتيوب أو تيك توك أو إنستغرام إلى أداة جديدة يفك زوارك قفلها بنقرات قليلة.',
        content: [
          '<h2>ما الذي ستنشئه</h2>',
          '<p>أداة تنزيل الفيديو هي رابط فك قفل عادي تكون وجهته خدمة تنزيل. يكمل الزائر خطوات فك القفل ثم يحصل على صفحة تنزيل الفيديو الذي طلبه.</p>',
          '<h2>خطوة بخطوة</h2>',
          '<ol>',
          '<li><strong>افتح لوحة التحكم</strong> واختر <a href="/dashboard/links/new">إنشاء رابط</a>.</li>',
          '<li><strong>املأ تفاصيل الرابط.</strong> استخدم عنوانًا محددًا مثل «نزّل فيديوهات تيك توك بدون علامة مائية»، وألصق صفحة التنزيل في حقل <strong>وجهة الرابط</strong>.</li>',
          '<li><strong>أضف خطوات فك القفل.</strong> اختر <strong>إضافة إجراء</strong>، ثم حدد المنصة التي تريد تنميتها والإجراء المناسب: متابعة أو اشتراك أو إعجاب.</li>',
          '<li><strong>اجعل الخطوات قصيرة.</strong> تكفي نقرة واحدة لكل خطوة، ويجب أن يفهم الزائر ما سيحصل عليه قبل أن يبدأ.</li>',
          '<li><strong>أنشئ الرابط</strong> وانسخ عنوانه العام من نافذة التأكيد.</li>',
          '<li><strong>شاركه حيث يوجد جمهورك</strong>: السيرة، وصف الفيديو، تعليق مثبت أو ستوري.</li>',
          '</ol>',
          '<blockquote>نصيحة: انشر أداة تنزيل لكل منصة بدلًا من أداة عامة للفيديو. يتعرّف الزائر على المنصة التي يستخدمها بالفعل ويكمل مزيدًا من الروابط.</blockquote>',
          '<h2>قائمة تحقق قبل المشاركة</h2>',
          '<ul>',
          '<li>تُفتح الوجهة دون تسجيل دخول.</li>',
          '<li>يذكر العنوان المنصة ونوع الملف.</li>',
          '<li>تشير كل خطوة إلى حساب أو فيديو أو خادم حقيقي.</li>',
          '<li>جرّبت الرابط مرة واحدة من الهاتف.</li>',
          '</ul>',
        ].join(''),
      },
    },
  },
  {
    slug: 'register-on-ogads',
    title: 'Register on OGAds with our referral link',
    excerpt:
      'Create your OGAds account, pass the review and connect your content locker in a few minutes.',
    content: [
      '<h2>Why OGAds</h2>',
      '<p>OGAds is a CPA network with content lockers. You place an offer locker as the destination of an unlock link, and you earn when a visitor completes an offer.</p>',
      '<h2>Create your account</h2>',
      '<ol>',
      `<li>Open the <a href="${referralUrl}">OGAds signup page through our referral link</a>.</li>`,
      '<li>Enter your name, email and a strong password, then confirm the email OGAds sends you.</li>',
      '<li>Choose your main traffic source (social media, a website or a content locker) and the countries you target.</li>',
      '<li>Describe honestly how you send traffic: bio links, video descriptions, community posts.</li>',
      '<li>Submit the application. Accounts are reviewed manually and approval usually comes quickly.</li>',
      '</ol>',
      '<h2>After approval</h2>',
      '<ol>',
      '<li>Sign in and open the content locker section to create your first locker.</li>',
      '<li>Copy the locker URL.</li>',
      '<li>In Link Unlocker, create an unlock link and paste the locker URL as the destination.</li>',
      '<li>Add your social steps, publish the link and share it with your audience.</li>',
      '</ol>',
      '<h2>Getting paid</h2>',
      '<ul>',
      '<li>Complete your payment profile before your first payout.</li>',
      '<li>Check the minimum payout for the method you choose.</li>',
      '<li>Keep your traffic honest: offers only work when visitors agree to the exchange.</li>',
      '</ul>',
      '<blockquote>Referral note: signing up through our link costs you nothing extra and supports this project.</blockquote>',
    ].join(''),
    translations: {
      es: {
        title: 'Regístrate en OGAds con nuestro enlace de referido',
        excerpt:
          'Crea tu cuenta de OGAds, supera la revisión y conecta tu content locker en pocos minutos.',
        content: [
          '<h2>Por qué OGAds</h2>',
          '<p>OGAds es una red CPA con content lockers. Colocas un locker de ofertas como destino de un enlace de desbloqueo y ganas cuando un visitante completa una oferta.</p>',
          '<h2>Crea tu cuenta</h2>',
          '<ol>',
          `<li>Abre la <a href="${referralUrl}">página de registro de OGAds con nuestro enlace de referido</a>.</li>`,
          '<li>Introduce tu nombre, tu correo y una contraseña segura, y confirma el correo que te envía OGAds.</li>',
          '<li>Elige tu fuente de tráfico principal (redes sociales, sitio web o content locker) y los países a los que te diriges.</li>',
          '<li>Describe con sinceridad cómo envías tráfico: enlaces en la biografía, descripciones de vídeos, publicaciones en comunidades.</li>',
          '<li>Envía la solicitud. Las cuentas se revisan manualmente y la aprobación suele tardar poco.</li>',
          '</ol>',
          '<h2>Después de la aprobación</h2>',
          '<ol>',
          '<li>Inicia sesión y abre la sección de content lockers para crear tu primer locker.</li>',
          '<li>Copia la URL del locker.</li>',
          '<li>En Link Unlocker, crea un enlace de desbloqueo y pega la URL del locker como destino.</li>',
          '<li>Añade tus pasos sociales, publica el enlace y compártelo con tu público.</li>',
          '</ol>',
          '<h2>Cómo cobrar</h2>',
          '<ul>',
          '<li>Completa tu perfil de pago antes del primer cobro.</li>',
          '<li>Revisa el mínimo de pago del método que elijas.</li>',
          '<li>Cuida la calidad del tráfico: las ofertas solo atraen a visitantes que aceptan el intercambio.</li>',
          '</ul>',
          '<blockquote>Nota sobre el referido: registrarte con nuestro enlace no te cuesta nada extra y apoya este proyecto.</blockquote>',
        ].join(''),
      },
      'pt-br': {
        title: 'Cadastre-se na OGAds com o nosso link de indicação',
        excerpt:
          'Crie sua conta na OGAds, passe pela revisão e conecte seu content locker em poucos minutos.',
        content: [
          '<h2>Por que a OGAds</h2>',
          '<p>A OGAds é uma rede de CPA com content lockers. Você usa um locker de ofertas como destino de um link de desbloqueio e ganha quando o visitante conclui uma oferta.</p>',
          '<h2>Crie sua conta</h2>',
          '<ol>',
          `<li>Abra a <a href="${referralUrl}">página de cadastro da OGAds com o nosso link de indicação</a>.</li>`,
          '<li>Informe seu nome, e-mail e uma senha forte, e confirme o e-mail que a OGAds enviar.</li>',
          '<li>Escolha sua principal fonte de tráfego (redes sociais, site ou content locker) e os países que você quer atingir.</li>',
          '<li>Descreva com honestidade como você envia tráfego: links na bio, descrições de vídeos, publicações em comunidades.</li>',
          '<li>Envie a inscrição. As contas passam por revisão manual e a aprovação costuma sair rápido.</li>',
          '</ol>',
          '<h2>Depois da aprovação</h2>',
          '<ol>',
          '<li>Entre na conta e abra a seção de content lockers para criar o primeiro locker.</li>',
          '<li>Copie a URL do locker.</li>',
          '<li>No Link Unlocker, crie um link de desbloqueio e cole a URL do locker como destino.</li>',
          '<li>Adicione suas etapas sociais, publique o link e compartilhe com o seu público.</li>',
          '</ol>',
          '<h2>Como receber</h2>',
          '<ul>',
          '<li>Complete o perfil de pagamento antes do primeiro saque.</li>',
          '<li>Confira o valor mínimo de saque do método escolhido.</li>',
          '<li>Mantenha a qualidade do tráfego: as ofertas só atraem quem aceita a troca.</li>',
          '</ul>',
          '<blockquote>Nota sobre a indicação: cadastrar-se pelo nosso link não custa nada a mais para você e apoia este projeto.</blockquote>',
        ].join(''),
      },
      ar: {
        title: 'سجّل في OGAds عبر رابط الإحالة الخاص بنا',
        excerpt: 'أنشئ حسابك في OGAds واجتز المراجعة واربط content locker في دقائق.',
        content: [
          '<h2>لماذا OGAds</h2>',
          '<p>شبكة OGAds شبكة CPA تقدم content lockers. تضع locker العروض كوجهة لرابط فك القفل، وتربح عندما يكمل الزائر عرضًا.</p>',
          '<h2>أنشئ حسابك</h2>',
          '<ol>',
          `<li>افتح <a href="${referralUrl}">صفحة التسجيل في OGAds عبر رابط الإحالة الخاص بنا</a>.</li>`,
          '<li>أدخل اسمك وبريدك وكلمة مرور قوية، ثم أكّد الرسالة التي ترسلها إليك OGAds.</li>',
          '<li>اختر مصدر حركة المرور الأساسي (وسائل التواصل أو موقع ويب أو content locker) واختر الدول التي تستهدفها.</li>',
          '<li>اشرح بصدق كيف ترسل الزيارات: روابط في السيرة، أوصاف فيديوهات، منشورات في المجتمعات.</li>',
          '<li>أرسل الطلب. تراجع OGAds الحسابات يدويًا وتتم الموافقة عادة بسرعة.</li>',
          '</ol>',
          '<h2>بعد الموافقة</h2>',
          '<ol>',
          '<li>سجّل الدخول وافتح قسم content lockers لإنشاء أول locker.</li>',
          '<li>انسخ عنوان locker.</li>',
          '<li>في Link Unlocker، أنشئ رابط فك قفل وألصق عنوان locker كوجهة.</li>',
          '<li>أضف خطواتك الاجتماعية، وانشر الرابط وشاركه مع جمهورك.</li>',
          '</ol>',
          '<h2>كيف تستلم أرباحك</h2>',
          '<ul>',
          '<li>أكمل بيانات الدفع قبل أول سحب.</li>',
          '<li>راجع الحد الأدنى للسحب في الوسيلة التي تختارها.</li>',
          '<li>حافظ على جودة الزيارات: العروض تجذب من يقبل التبادل فقط.</li>',
          '</ul>',
          '<blockquote>ملاحظة عن الإحالة: التسجيل عبر رابطنا لا يضيف أي تكلفة عليك ويدعم هذا المشروع.</blockquote>',
        ].join(''),
      },
    },
  },
]

const guideMenu = {
  title: 'Guides',
  labels: { en: 'Guides', es: 'Guías', 'pt-br': 'Guias', ar: 'الأدلة' },
  icon: 'circleHelp',
  sortOrder: 10,
  children: [
    {
      slug: 'social-video-downloader',
      title: 'Social video downloader',
      labels: {
        en: 'Social video downloader',
        es: 'Descargador de vídeo social',
        'pt-br': 'Baixador de vídeo social',
        ar: 'تنزيل فيديو من وسائل التواصل',
      },
      icon: 'download',
      sortOrder: 0,
    },
    {
      slug: 'register-on-ogads',
      title: 'Register on OGAds',
      labels: {
        en: 'Register on OGAds',
        es: 'Regístrate en OGAds',
        'pt-br': 'Cadastre-se na OGAds',
        ar: 'التسجيل في OGAds',
      },
      icon: 'gift',
      sortOrder: 1,
    },
  ],
} as const

async function ensurePage(page: DemoPage): Promise<string> {
  const existing = await prisma.customPage.findUnique({
    where: { slug: page.slug },
    select: { id: true },
  })
  if (existing) {
    console.info(`[demo] Page "${page.slug}" already exists - left unchanged.`)
    return existing.id
  }

  const created = await prisma.customPage.create({
    data: {
      slug: page.slug,
      title: page.title,
      excerpt: page.excerpt,
      content: page.content,
      status: 'PUBLISHED',
      translations: page.translations,
    },
    select: { id: true },
  })
  console.info(`[demo] Created page "${page.slug}".`)
  return created.id
}

async function ensureGuideMenu(pageIds: Map<string, string>) {
  let group = await prisma.customMenuItem.findFirst({
    where: { parentId: null, title: guideMenu.title },
    select: { id: true },
  })

  if (!group) {
    group = await prisma.customMenuItem.create({
      data: {
        title: guideMenu.title,
        labels: guideMenu.labels,
        icon: guideMenu.icon,
        sortOrder: guideMenu.sortOrder,
        isActive: true,
      },
      select: { id: true },
    })
    console.info(`[demo] Created "${guideMenu.title}" sidebar group.`)
  } else {
    console.info(`[demo] Sidebar group "${guideMenu.title}" already exists - left unchanged.`)
  }

  for (const child of guideMenu.children) {
    const pageId = pageIds.get(child.slug)
    if (!pageId) continue
    const existing = await prisma.customMenuItem.findFirst({
      where: { parentId: group.id, pageId },
      select: { id: true },
    })
    if (existing) {
      console.info(`[demo] Menu link "${child.title}" already exists - left unchanged.`)
      continue
    }
    await prisma.customMenuItem.create({
      data: {
        parentId: group.id,
        pageId,
        title: child.title,
        labels: child.labels,
        icon: child.icon,
        sortOrder: child.sortOrder,
        isActive: true,
      },
    })
    console.info(`[demo] Linked "${child.title}" in the sidebar.`)
  }
}

async function main() {
  const pageIds = new Map<string, string>()
  for (const page of demoPages) {
    pageIds.set(page.slug, await ensurePage(page))
  }
  await ensureGuideMenu(pageIds)
  if (!process.env.OGADS_REFERRAL_URL?.trim()) {
    console.info(
      '[demo] OGADS_REFERRAL_URL is not set - the OGAds guide links to https://ogads.com.',
    )
  }
}

main()
  .catch((error) => {
    console.error('[demo] failed', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
