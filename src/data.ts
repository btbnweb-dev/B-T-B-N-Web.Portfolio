export const navigation = [
  { label: 'Ажлууд', href: '/work' }, { label: 'Үйлчилгээ', href: '/services' },
  { label: 'Миний тухай', href: '/about' }, { label: 'Холбогдох', href: '/contact' },
]
export type Project = {
  id: string; number: string; name: string; category: string; status: string; year: string
  /**
   * Presentation weight, not a quality judgement.
   * `major`   — production/deployed work, shown as large editorial features.
   * `flagship` — concept work whose interaction is the point; shown large, clearly labelled Concept.
   * `concept` — smaller studies, shown in the secondary grid.
   */
  tier: 'major' | 'flagship' | 'concept'
  description: string; headline: string; role: string; tech: string[]; filters: string[]
  image: string; mobile: string; detail: string; href?: string; liveLabel?: string; githubUrl?: string; accent: string
  domain: string; scope: string
  overview: string; problem: string; solution: string; design: string; development: string
  scenes: { key: string; title: string; text: string }[]
  features: { title: string; text: string }[]; challenge: string; resolution: string; result: string
}
/**
 * Build-time fallback used for the first paint and when /api/projects is unreachable.
 * D1 is the source of truth at runtime — edit projects in /admin, not here.
 */
export const projects: Project[] = [
  {
    id: 'citiled', number: '01', name: 'Citiled', category: 'Production Web System', status: 'Production', year: '2026', tier: 'major',
    headline: 'Каталогоос удирдлага хүртэл нэг систем.',
    description: 'LED дэлгэцийн компанийн бүтээгдэхүүн, үйлчилгээг монгол, англи, хятад гурван хэлээр нэг дор хүргэх production вэб систем. Үзүүлэлт байнга өөрчлөгддөг тул контентоо өөрсдөө шинэчилдэг байхаар бүтээсэн.',
    role: 'Full-stack хөгжүүлэлт', tech: ['Next.js', 'TypeScript', 'PostgreSQL', 'Prisma', 'Cloudflare Workers', 'GitHub Actions'],
    filters: ['Production', 'Full-stack'], image: '/previews/citiled-desktop.jpg', mobile: '/previews/citiled-mobile.jpg',
    detail: '/previews/citiled-catalog.jpg',
    href: 'https://citiled.citiled-mn.workers.dev', liveLabel: 'citiled.citiled-mn.workers.dev', accent: 'citiled',
    domain: 'LED дэлгэц · Улаанбаатар', scope: 'Дизайн, хөгжүүлэлт, deployment',
    overview: 'Citiled бол 2020 оноос хойш дотор, гадна болон арга хэмжээний LED дэлгэц нийлүүлж, засвар үйлчилгээ үзүүлдэг компани. Тэдний бүтээгдэхүүн, техникийн үзүүлэлт, үйлчилгээг ойлгомжтой танилцуулж, мэдээллийг нь кодонд гар хүрэлгүйгээр удирдах боломжтой вэб системийг эхнээс нь бүтээсэн.',
    problem: 'Бүтээгдэхүүний үнэ, техникийн үзүүлэлт байнга өөрчлөгддөг. Тэр болгонд хөгжүүлэгч рүү хандах шаардлагагүй байх ёстой. Мөн монгол, англи, хятад хэлтэй үйлчлүүлэгч нэг ижил мэдээллийг өөрийн хэлээрээ бүрэн авах шаардлагатай байв.',
    solution: 'Нийтийн талд каталог, бүтээгдэхүүний дэлгэрэнгүй, үйлчилгээ, тусламж, холбоо барих хэсгийг нэг урсгалд холбосон. Бүтээгдэхүүний мэдээллийг контент удирдлагын хэсгээс шинэчлэхэд шинэ загвар, өөрчлөгдсөн үзүүлэлт нийтийн хуудсанд шууд тусна. Хэл болон харагдах горимын сонголтыг толгой хэсэгт байрлуулсан.',
    design: 'LED дэлгэцийн бодит дүрслэлийг гол болгохын тулд нүүр хэсэгт том зураг, уншихад хялбар мэдээллийн блок ашигласан. Бүтээгдэхүүн бүрийн pixel pitch, гэрэлтүүлэг, харах зайг нэг бүтэцтэй карт дээр эмхэлж, харьцуулахад хялбар болгосон. Урт нь өөр гурван хэлний текстийг нэг зохион байгуулалтад багтаахаар зайг уян тохируулсан.',
    development: 'Next.js дээр олон хэлний хуудас, каталог, контент шинэчлэх урсгалыг нэгтгэсэн. Шинэ бүтээгдэхүүний гурван хэлний мэдээлэл нэг бүтэцтэй хадгалагдаж, нийтийн хуудсанд хамт шинэчлэгдэнэ. Сайт Cloudflare дээр production-д ажиллаж байна.',
    scenes: [
      { key: '01', title: 'Динамик каталог', text: 'Бүтээгдэхүүнүүд дотор, гадна, сурталчилгаа, арга хэмжээ гэсэн зориулалтаар ангилагдана. Карт бүр дээр үнэ, pixel pitch, гэрэлтүүлэг зэрэг техникийн үзүүлэлт харагдана.' },
      { key: '02', title: 'Бүтээгдэхүүний дэлгэрэнгүй', text: 'Тус бүрдээ зураг, бүрэн үзүүлэлт, зориулалтын тайлбартай хуудастай. Эндээс шууд холбоо барих алхам руу шилждэг.' },
      { key: '03', title: 'Контент шинэчлэлт', text: 'Компанийн ажилтан бүтээгдэхүүний мэдээллээ хөгжүүлэгчгүйгээр шинэчилнэ.' },
      { key: '04', title: 'Гурван хэл, харагдах горим', text: 'MN / EN / 中文 хооронд шилжих, гэрэл болон харанхуй горим сонгох тохиргоо толгой хэсэгт байрлана.' },
    ],
    features: [
      { title: 'Каталог ба ангилал', text: 'Зориулалтаар ангилсан бүтээгдэхүүн, техникийн үзүүлэлттэй дэлгэрэнгүй хуудас.' },
      { title: 'Контент удирдлага', text: 'Бүтээгдэхүүний мэдээллийг хөгжүүлэгчгүйгээр шинэчлэх боломжтой.' },
      { title: 'Гурван хэлний интерфэйс', text: 'Монгол, англи, хятад хэлний агуулга нэг бүтэцтэй хадгалагдана.' },
      { title: 'Бүтээгдэхүүний харьцуулалт', text: 'Pixel pitch, гэрэлтүүлэг, харах зайг нэг бүтэцтэй карт дээр эмхэлсэн.' },
      { title: 'Хайлтын системд ойлгогдох бүтэц', text: 'Хуудас бүр гурван хэл дээр тусдаа хаягтай, утга бүхий гарчигтай.' },
      { title: 'Production дээр ажиллаж байна', text: 'Cloudflare дээр байршсан, өдөр тутам ашиглагддаг сайт.' },
    ],
    challenge: 'Гурван хэлний өөр өөр урттай текстийг нэг зохион байгуулалтад эвтэйхэн багтаах.',
    resolution: 'Картын зай, мөрийн өндрийг уян хийж, хятад ханзны нягт бичиглэл болон монгол урт үгийн аль алинд таарахаар тохируулсан. Хэл солих бүрд бүтэц, уншигдах байдлыг ижил шалгуураар шалгасан.',
    result: 'Танилцуулга хуудас биш, өдөр тутам ашиглагддаг систем. Дизайн, frontend, өгөгдөл, нийтлэлт хүртэлх бүх алхмыг нэг хүн төлөвлөж, хөгжүүлж, production-д гаргасан.',
  },
  {
    id: 'gaming-course', number: '02', name: 'ArenaHub', category: 'Diploma / Full-stack Learning Platform',
    status: 'Live · Diploma', year: '2026', tier: 'major', headline: 'Код бич. Түвшнээ ахиул. XP цуглуул.',
    description: 'Програмчлалын сургалтыг тоглоомын механиктай холбосон платформ. 8 курс, 56 хичээл, 280+ практик даалгавар. Дипломын ажил — одоо нийтэд нээлттэй ажиллаж байна.',
    role: 'UI/UX · Full-stack хөгжүүлэлт', tech: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL'],
    filters: ['Full-stack'], image: '/previews/gaming-desktop.jpg', mobile: '/previews/gaming-mobile.jpg',
    detail: '/previews/gaming-courses.jpg',
    href: 'https://btbn-arenahub.vercel.app', liveLabel: 'btbn-arenahub.vercel.app', accent: 'gaming',
    domain: 'IT сургалт · Gamification', scope: 'Дизайн, хөгжүүлэлт, deployment',
    overview: 'ArenaHub бол програмчлалын сургалтыг тоглоомын механиктай холбосон дипломын төсөл. Онолын хичээл уншаад орхихын оронд даалгавар бүр тоглоомыг урагшлуулж, суралцагч ахицаа XP болон leaderboard дээр шууд хардаг.',
    problem: 'Онол уншаад л өнгөрөхөд суралцагч ахицаа харах, юу сурснаа шалгах боломж бага. Бодитоор код бичих алхам нь сургалтын урсгалын нэг хэсэг байх шаардлагатай байв.',
    solution: 'Сургалтыг курс → хичээл → даалгавар гэсэн шатлалд оруулж, даалгавар бүрийг тоглоомын механиктай холбосон. Зөв хариулт дайсныг устгаж, буруу хариулт HP хорогдуулна. Гүйцэтгэл XP болж, leaderboard дээрх байрлалд нөлөөлнө.',
    design: 'Pixel typography, бараан дэвсгэр, тод ногоон болон нил ягаан өнгөөр сургалтын платформыг тоглоомын интерфэйс шиг харагдуулсан. Нүүр хэсэгт 8 курс / 56 хичээл / 280+ даалгаврын тоо болон live ranking-ийг зэрэг харуулж, шинэ зочинд агуулгын хэмжээг шууд ойлгуулна.',
    development: 'Next.js App Router нь хуудас болон API-г хариуцна. Курс, хичээл, даалгавар, суралцагчийн ахиц, илгээсэн хариултыг Prisma-аар загварчилж PostgreSQL-д хадгална. Код бичих хэсэгт Monaco Editor, тоглоомын дүрслэлд canvas ашигласан. Нийтийн хувилбар Vercel дээр байрлана.',
    scenes: [
      { key: '01', title: 'Курсын зам', text: 'HTML, CSS, JavaScript, Advanced JS, React, Node.js, Database, Deploy гэсэн 8 курс дараалалтай байрлана. Эхнээсээ эхлэхэд fullstack чиглэл бүрэн хамрагдана.' },
      { key: '02', title: 'Тоглоомын механик', text: 'Даалгавар бодох нь тоглоомыг урагшлуулна. Зөв хариулт дайсныг устгана, буруу хариулт HP хорогдуулна.' },
      { key: '03', title: 'XP ба leaderboard', text: 'Гүйцэтгэл XP болж хуримтлагдана. Live ranking хэсэгт тэргүүлэгчид бодит цагт эрэмбэлэгдэнэ.' },
      { key: '04', title: 'AI туслах', text: 'Даалгавар дээр тээглэхэд санамж, тайлбар, кодын жишээ өгдөг AI туслах нэмсэн.' },
    ],
    features: [
      { title: '8 курс, 56 хичээл', text: 'HTML-ээс Deploy хүртэл fullstack чиглэлийн бүтэцлэгдсэн сургалтын зам.' },
      { title: '280+ практик даалгавар', text: 'Хичээл бүрийн дараа шууд код бичиж шалгуулах бодит даалгавар.' },
      { title: 'Тоглоомын механик', text: 'Дайсан, HP, түвшин — даалгаврын үр дүн тоглоомын явцад шууд нөлөөлнө.' },
      { title: 'Live leaderboard', text: 'XP-ээр эрэмбэлэгдсэн дэлхийн жагсаалт нүүр хуудсан дээрээс харагдана.' },
      { title: 'AI туслах', text: 'Санамж, тайлбар, кодын жишээгээр дараагийн алхмыг заана.' },
      { title: 'Хоёр хэл, responsive', text: 'MON / ENG сонголт. Гар утсанд зориулсан тусдаа зохион байгуулалт.' },
    ],
    challenge: 'Хичээлийн агуулга, код бичих орчин, тоглоомын төлөв гурвыг нэг дэлгэцэнд ойлгомжтой багтаах.',
    resolution: 'Хичээл, editor, тоглоомын хэсгийг тусдаа component болгон салгаж, backend үйлдлүүдийг service давхаргад төвлөрүүлсэн. Жижиг дэлгэцэнд эдгээр хэсгүүд дараалан харагдаж, доод навигацаар шилжинэ.',
    result: 'Дипломын ажлын хүрээнээс хальж, нийтэд нээлттэй ажиллаж буй платформ болсон. Frontend, API, өгөгдлийн сан, сургалтын агуулга, тоглоомын логик, deployment — бүгдийг нэг хүн бүтээсэн.',
  },
  {
    id: 'axion-x1', number: '03', name: 'AXION X1', category: 'Concept · 3D Product Site', status: 'Concept Project', year: '2026', tier: 'flagship',
    headline: 'Scroll нь 3D бүтээгдэхүүнийг удирдана.',
    description: 'Видео картыг spec хүснэгтээр бус, scroll-д холбосон 3D үзүүлбэрээр танилцуулахыг туршсан concept. Доош гүйлгэхэд модель эргэж, задарч, дотоод давхаргууд нь дараалан харагдана.',
    role: 'Дизайн · Frontend · 3D', tech: ['React', 'TypeScript', 'Three.js', 'React Three Fiber', 'GSAP ScrollTrigger', 'Vite'],
    filters: ['Concept'], image: '/previews/axion-desktop.jpg', mobile: '/previews/axion-mobile.jpg',
    detail: '/previews/axion-detail.jpg',
    href: 'https://btbn-axion-gpu.vercel.app', liveLabel: 'btbn-axion-gpu.vercel.app', accent: 'axion',
    domain: 'Зохиомол техник хангамж', scope: 'Дизайн, frontend, 3D',
    overview: 'AXION X1 бол зохиомол видео картын concept сайт. Бодит бүтээгдэхүүн биш, худалдаанд ч байхгүй. Асуулт нь энгийн байсан: техникийн бүтээгдэхүүнийг зураг, хүснэгтээр биш, өөрөө эргүүлж үзэж байгаа мэт танилцуулж болох уу?',
    problem: 'Техник хангамжийн сайтууд ихэвчлэн рендер зураг, дараа нь spec хүснэгт гэсэн хоёр хэсэгт хуваагддаг. Хэрэглэгч бүтээгдэхүүний дотоод бүтцийг төсөөлөх боломжгүй.',
    solution: 'Картыг код дотор procedural байдлаар угсарч, scroll-ийн явцыг камер болон эд ангийн байрлалд шууд холбосон. Есөн үе шат дараалан өрнөнө: бүтэн загвар, хөргөлт, задаргаа, цөм, материал, гэрэлтүүлэг, эцэст нь дахин угсрах.',
    design: 'Бараан дэвсгэр, cyan аксент, mono бичвэр. Гэрэл нь картны ирмэг, металл гадаргууг тодруулах үүрэгтэй тул дэвсгэр чимэглэл багатай. Текст блокууд картны хөдөлгөөнтэй мөргөлдөхгүйн тулд талбайн зах руу байрлана.',
    development: 'React Three Fiber дээр сцен барьж, GSAP ScrollTrigger-ийн явцыг камерын байрлал, эргэлт, эд ангийн задаргаатай шууд холбосон. Гурван сэнс, heatsink, PCB, backplate зэрэг хэсгийг тусад нь бүлэглэсэн тул үе шат бүрт өөр давхарга ил гарна.',
    scenes: [
      { key: '01', title: 'Бүтэн загвар', text: 'Эхний дэлгэцэд карт бүтнээрээ эргэж, өнцөг нь өөрчлөгдөнө. Scroll эхлэхэд шууд хариу үзүүлнэ.' },
      { key: '02', title: 'Задаргаа', text: 'Хөргөлт, цөм, санах ой, тэжээл, backplate давхарга тус бүр салж, хоорондын зай нээгдэнэ.' },
      { key: '03', title: 'Дотоод хэсэг', text: 'Камер цөм рүү ойртож, GPU core болон эргэн тойрны бүтэц харагдана.' },
      { key: '04', title: 'Дахин угсралт', text: 'Давхаргууд буцаад байрандаа орж, эцсийн бүтээгдэхүүний төрх үлдэнэ.' },
    ],
    features: [
      { title: 'Procedural 3D загвар', text: 'Карт нь гаднаас оруулсан файл биш, кодоор угсрагдсан геометр.' },
      { title: 'Scroll-д холбосон камер', text: 'Гүйлгэх хөдөлгөөн камерын байрлал, эргэлтийг шууд удирдана.' },
      { title: 'Exploded view', text: 'Эд ангиуд дараалан салж, дотоод бүтэц харагдана.' },
      { title: 'Reduced motion', text: 'Хөдөлгөөн багасгах тохиргоотой үед үе шат бүр зогсонги дүрслэлээр харагдана.' },
    ],
    challenge: 'Scroll-ийн явцаар камер, эргэлт, задаргаа гурвыг зэрэг удирдахад аль ч байрлалд эвгүй өнцөг үүсгэхгүй байх.',
    resolution: 'Бүх хөдөлгөөнийг нэг timeline дээр төвлөрүүлж, үе шат бүрийн эхлэл, төгсгөлийг тодорхой интервалд хуваасан. Дээш гүйлгэхэд дараалал буцаж, ижил байрлалд ижил төрх үлдэнэ.',
    result: 'Техникийн бүтээгдэхүүнийг scroll-оор судлах боломжтой concept. Гүйцэтгэлийн бодит үзүүлэлт биш, танилцуулах арга барилыг туршсан ажил.',
  },
  {
    id: 'khure-residence', number: '04', name: 'KHURE Residence', category: 'Concept · Residential Site', status: 'Concept Project', year: '2026', tier: 'flagship',
    headline: 'Барилгын төслийг нэг урсгалаар.',
    description: 'Орон сууцны төслийн мэдээллийг салангид хэсгүүдийн цуваа биш, scroll даган өрнөх архитектурын танилцуулга болгосон concept. Фасад, орон сууцны төрөл, төлөвлөлт, нийтийн орчныг нэг дараалалд холбосон.',
    role: 'Дизайн · Frontend', tech: ['React', 'TypeScript', 'GSAP ScrollTrigger', 'Tailwind CSS', 'Vite'],
    filters: ['Concept'], image: '/previews/khure-desktop.jpg', mobile: '/previews/khure-mobile.jpg',
    detail: '/previews/khure-detail.jpg',
    href: 'https://btbn-khure-resideence.vercel.app', liveLabel: 'btbn-khure-resideence.vercel.app', accent: 'khure',
    domain: 'Зохиомол орон сууцны концепц', scope: 'Дизайн, frontend',
    overview: 'KHURE Residence бол зохиомол орон сууцны концепц. Бодит төсөл, хаяг, үнэ, борлуулалт байхгүй. Барилгын танилцуулгыг зураг, текстийн жагсаалт биш, уншигчийг дагуулж өрнөх дараалал болгож туршсан.',
    problem: 'Орон сууцны сайтууд ихэвчлэн галерей, төлөвлөлт, үнэ гэсэн салангид хэсгүүдээс бүрддэг. Орон зайн мэдрэмж, төлөвлөлтийн логик хоёр хоорондоо холбогдохгүй үлддэг.',
    solution: 'Фасадны дээр blueprint тор зурагдаж, техникийн шошгууд дараалан гарч ирдэг pinned хэсэг хийсэн. Орон сууцны А/Б/В төрлийг sticky зургийн багана дээр солигдуулж, текст нь хажуугаар гүйнэ. Нийтийн орчны хэсэгт зураг бүр scroll-той хамт нээгдэнэ.',
    design: 'Чулуун цагаан, нүүрсний саарал, хүрэл аксент. Playfair Display гарчиг, mono техникийн шошго. Зураг том, текст цөөн — орон зай өөрөө тайлбарлах ёстой гэсэн зарчмаар.',
    development: 'GSAP ScrollTrigger дээр pin болон scrub хийсэн хоёр үндсэн хэсэг: архитектурын blueprint, хэвтээ галерей. Орон сууцны багана CSS sticky дээр ажиллаж, зургийн давхаргууд scroll-ийн байрлалаар солигдоно. Гар утсанд pin-ийг бүрэн унтрааж, босоо дараалал болгоно.',
    scenes: [
      { key: '01', title: 'Архитектур', text: 'Фасадны зураг дээр blueprint тор зурагдаж, FACADE, DAYLIGHT, TERRACE шошгууд нэг нэгээр гарч ирнэ.' },
      { key: '02', title: 'Орон сууцны төрөл', text: 'Нэг, хоёр, гурван өрөөний зураг sticky баганад солигдож, тайлбар нь хажуугаар гүйнэ.' },
      { key: '03', title: 'Төлөвлөлт', text: 'SVG төлөвлөлтийн зураг өрөөний шошготойгоор зурагдана. Гурван төрлийг табаар сольж үзнэ.' },
      { key: '04', title: 'Галерей', text: 'Босоо scroll хэвтээ хөдөлгөөн болж, зургийн туузыг гүйлгэнэ.' },
    ],
    features: [
      { title: 'Pinned архитектур', text: 'Blueprint тор, техникийн шошго scroll-ийн явцад давхарлан гарна.' },
      { title: 'Sticky орон сууц', text: 'А/Б/В төрөл нэг багана дээр солигдож, текст тус бүрдээ гүйнэ.' },
      { title: 'Хэвтээ галерей', text: 'Pinned хэсэгт босоо scroll хэвтээ туузыг удирдана.' },
      { title: 'Хөдөлгөөнгүй хувилбар', text: 'Reduced motion үед pin, scrub бүгд унтарч, агуулга бүтнээрээ уншигдана.' },
    ],
    challenge: 'Хэд хэдэн pinned хэсгийг дараалуулахад хооронд нь хоосон гүйлгэлт үүсэхгүй, гар утсан дээр хэрэглэгчийн хуруутай зөрчилдөхгүй байх.',
    resolution: 'Pin-ийн уртыг агуулгын хэмжээнээс тооцож, хоорондох хэсгүүдэд scroll-той холбоотой жижиг хөдөлгөөн нэмсэн. 900px-ээс доош pin бүрэн унтарч, энгийн босоо дараалал болно.',
    result: 'Барилгын төслийг эхнээс нь дуустал нэг урсгалаар үзэх боломжтой concept. Зохиомол төсөл тул үнэ, борлуулалт, холбоо барих мэдээлэл байхгүйг сайт дээр тодорхой бичсэн.',
  },
  {
    id: 'coffee-shop', number: '05', name: 'Morrow Coffee', category: 'Concept Landing Page', status: 'Concept Project', year: '2026', tier: 'concept',
    headline: 'Өглөөний кофены дулаан мэдрэмж.',
    description: 'Кофе шопын уур амьсгал, меню, байршлыг нэг тайван урсгалд цэгцэлсэн concept.',
    role: 'Дизайн · Frontend', tech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'], filters: ['Landing Page', 'Concept'],
    image: '/previews/morrow-desktop.jpg', mobile: '/previews/morrow-mobile.jpg', detail: '/previews/morrow-desktop.jpg',
    href: 'https://btbn-morrow-coffee.vercel.app', liveLabel: 'btbn-morrow-coffee.vercel.app', accent: 'coffee',
    domain: 'Кофе шоп', scope: 'Дизайн, frontend',
    overview: 'Жижиг кофе шопт зориулсан бие даасан concept. Меню, орчин, байршил гэсэн зочинд хэрэгтэй гурван мэдээллийг гол болгосон.',
    problem: 'Жижиг бизнесийн мэдээллийг урт навигацгүйгээр, нэг хуудсан дотор ойлгомжтой хүргэх.',
    solution: 'Уур амьсгалтай hero, ангилсан меню, орчны зураг, байршил, захиалгын загвар цонхыг нэг босоо урсгалд дараалуулсан.',
    design: 'Кофены бор өнгө, цайвар дэвсгэр, том зураг, чөлөөтэй зай. Зочинд урт тайлбараас өмнө орчныг зургаар мэдрүүлэхийг зорьсон.',
    development: 'React component, TypeScript төлөв, Tailwind CSS. Дотоод холбоосууд зочныг хэрэгтэй хэсэгт хүргэнэ. Захиалгын цонх keyboard болон Escape-аар удирдагдана.',
    scenes: [],
    features: [
      { title: 'Меню', text: 'Ундааны зураг, нэр, тайлбартай танилцуулга.' },
      { title: 'Захиалгын цонх', text: 'Keyboard болон Escape-аар удирдах боломжтой загвар interaction.' },
      { title: 'Responsive', text: 'Том зураг, меню, холбоосууд утасны дэлгэцэд дахин зохион байгуулагдана.' },
    ],
    challenge: 'Том зургийн уур амьсгалыг хадгалж, гар утсан дээр үндсэн мэдээллийг хурдан хүргэх.',
    resolution: 'Дэлгэцийн хэмжээнээс хамаарсан зургийн харьцаа, босоо бүтэц, цэгцтэй товчнууд ашигласан.',
    result: 'Кофе шопын өнгө төрх, меню, байршлыг нэг хуудсанд харуулсан concept. Захиалгын цонх нь загвар бөгөөд бодит хүсэлт илгээхгүй.',
  },
  {
    id: 'lune-beauty', number: '06', name: 'LUNE Beauty Studio', category: 'Concept Landing Page', status: 'Concept Project', year: '2026', tier: 'concept',
    headline: 'Тайван орон зай. Нарийн мэдрэмж.',
    description: 'Гоо сайхны студид зориулсан зөөлөн өнгө, зурагт тулгуурласан танилцуулга.',
    role: 'Дизайн · Frontend', tech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'], filters: ['Landing Page', 'Concept'],
    image: '/previews/lune-desktop.jpg', mobile: '/previews/lune-mobile.jpg', detail: '/previews/lune-desktop.jpg',
    href: 'https://btbn-lune-beauty.vercel.app', liveLabel: 'btbn-lune-beauty.vercel.app', accent: 'beauty',
    domain: 'Гоо сайхны студи', scope: 'Дизайн, frontend',
    overview: 'Студийн өнгө төрх, орчин, үйлчилгээ, үнийг харуулах concept. Бодит захиалагчийн ажил биш.',
    problem: 'Үйлчилгээнүүдийг тодорхой ялгаж харуулахын зэрэгцээ студийн тайван мэдрэмжийг алдахгүй байх.',
    solution: 'Үйлчилгээ, үнэ, томруулж үзэх галерей, цаг захиалах загвар цонх бүхий хуудас бүтээсэн.',
    design: 'Зөөлөн ягаан, крем өнгө, нарийн үсгийн хэлбэр, том зураг. Хэсэг хоорондын зайг уужим авч, мэдээллийг тайван унших хэмнэлтэй болгосон.',
    development: 'React төлөвөөр галерей болон захиалгын dialog-ийг удирдана. Responsive бүтэц, keyboard ажиллагаа, focus төлөвийг хамтад нь шийдсэн.',
    scenes: [],
    features: [
      { title: 'Үйлчилгээний танилцуулга', text: 'Үйлчилгээ бүрийн мэдээлэл, үнийг цэгцтэй харуулна.' },
      { title: 'Зургийн галерей', text: 'Зургийг dialog цонхоор томруулж үзнэ.' },
      { title: 'Цаг захиалах загвар', text: 'Үйлчилгээ сонгон маягт бөглөх туршилтын урсгал.' },
    ],
    challenge: 'Зураг ихтэй хуудсыг жижиг дэлгэцэд уншихад болон ашиглахад эвтэйхэн байлгах.',
    resolution: 'Галерейн зохион байгуулалт, текстийн өргөн, навигацыг дэлгэц бүрд тохируулж, зургийг шаардлагатай үед ачаална.',
    result: 'Гоо сайхны студийн дүр төрх, үйлчилгээний урсгалыг харуулсан concept. Цаг захиалах хэсэг нь demo.',
  },
  {
    id: 'nomad-build', number: '07', name: 'NOMAD Build', category: 'Concept Corporate Website', status: 'Concept Project', year: '2026', tier: 'concept',
    headline: 'Бүтээсэн ажлаар нь танилцуулъя.',
    description: 'Барилга, интерьерийн төслийн зураг, ангилал, дэлгэрэнгүйг нэг дор харуулах бизнесийн сайт.',
    role: 'Дизайн · Frontend', tech: ['React', 'TypeScript', 'Tailwind CSS', 'Vite'], filters: ['Concept'],
    image: '/previews/nomad-desktop.jpg', mobile: '/previews/nomad-mobile.jpg', detail: '/previews/nomad-desktop.jpg',
    href: 'https://btbn-nomad-build.vercel.app', liveLabel: 'btbn-nomad-build.vercel.app', accent: 'build',
    domain: 'Барилга · Интерьер', scope: 'Дизайн, frontend',
    overview: 'Барилга, интерьерийн компанид зориулсан concept танилцуулга. Үйлчилгээ, төсөл, ажлын дарааллыг нэг бүтэцтэй болгосон.',
    problem: 'Төслийн зургуудыг зүгээр нэг галерей болгохгүйгээр ангилал, тайлбар, дараагийн алхамтай холбох.',
    solution: 'Ангиллаар шүүгддэг төслүүд, дэлгэрэнгүй dialog, үйлчилгээний мэдээлэл, үнийн саналын загвар маягт бүтээсэн.',
    design: 'Архитектурын grid, тод typography, графит өнгө, бүтэн өргөний зураг. Ажлын дүрслэл голлох, текст нь тайлбарлах үүрэгтэй.',
    development: 'Төслийн шүүлтүүр болон dialog-ийг React төлөвөөр удирдана. Маягт нь хэрэглэгчийн мэдээллийг илгээхээс өмнө шалгана.',
    scenes: [],
    features: [
      { title: 'Төслийн шүүлтүүр', text: 'Ажлуудыг ангиллаар ялгаж үзэх боломж.' },
      { title: 'Дэлгэрэнгүй', text: 'Төслийн зураг, мэдээллийг тусдаа цонхонд үзүүлнэ.' },
      { title: 'Санал авах маягт', text: 'Шаардлагатай талбаруудыг шалгадаг demo холбоо барих маягт.' },
    ],
    challenge: 'Корпорацийн мэдээлэл болон том зургийн хооронд тэнцвэр олох.',
    resolution: 'Тогтвортой grid, богино тайлбар, тод гарчиг ашиглаж, төслийн дэлгэрэнгүйг тусдаа interaction болгосон.',
    result: 'Барилгын компанийн ажлыг танилцуулах, төслөө шүүх, дэлгэрэнгүй үзэх боломжтой concept. Зохиомол брэнд; захиалагчийн ажил биш.',
  },
]
export const services = [
  { title: 'Landing Page', subtitle: 'Нэг хуудас. Нэг тодорхой зорилго.', text: 'Нэг бүтээгдэхүүн, үйлчилгээ эсвэл хувийн брэндийг нэг хуудсаар танилцуулна. Зочны хийх гол үйлдлийг тодорхой байрлуулна.', items: ['Агуулгын бүтэц', 'Responsive frontend', 'Холбоо барих хэсэг', 'Хурдны тохиргоо'] },
  { title: 'Business Website', subtitle: 'Олон хуудас, бүрэн агуулга.', text: 'Үйлчилгээ, хийсэн ажил, байгууллагын мэдээллийг тусдаа хуудсуудаар ойлгомжтой хүргэнэ. Хайлтын системд ойлгогдох суурь бүтэцтэй.', items: ['Олон хуудасны бүтэц', 'Төслийн дэлгэрэнгүй', 'SEO суурь тохиргоо', 'Агуулга удирдах хувилбар'] },
  { title: 'Full-stack Web System', subtitle: 'Өгөгдөл, админ, нэвтрэлттэй.', text: 'Өгөгдөл, админ самбар, нэвтрэлт болон ажлын онцлогт тохирсон үйлдлүүдийг нэг системд холбоно. Citiled энэ төрлийн ажил.', items: ['Админ удирдлага', 'Өгөгдлийн сан ба нэвтрэлт', 'API ба интеграци', 'Хамгаалалтын тохиргоо'] },
  { title: 'Website Redesign', subtitle: 'Байгаа сайтыг цэгцлэх.', text: 'Агуулга, дизайн, гар утасны хэрэглээг дахин харж, гол үйлдлүүдийг хялбар болгоно. Байгаа кодыг бүрэн солихгүйгээр ч хийж болно.', items: ['UI/UX шинэчлэл', 'Responsive засвар', 'Хурд ба хүртээмж', 'Агуулгын бүтэц'] },
  { title: 'Deployment & Setup', subtitle: 'Нийтлэх, домэйн, шинэчлэлт.', text: 'Сайтыг нийтэлж, домэйн холбон, шинэчлэх урсгалыг тохируулна. Ашиглах болон шинэчлэх алхмуудыг баримтжуулж хүлээлгэн өгнө.', items: ['Cloudflare / Vercel', 'Домэйн ба HTTPS', 'GitHub Actions CI/CD', 'Хүлээлгэн өгөх заавар'] },
]
export const process = [
  { title: 'Ойлгох', text: 'Зорилго, хэрэглэгч, агуулга, хугацааг ярилцаж ажлын хүрээг тогтооно. Энэ шатанд юу хийхгүйгээ ч тодорхой болгоно.' },
  { title: 'Зураглах', text: 'Хуудасны урсгал, бүтэц, өнгө төрхийг гаргаж, гол дэлгэцүүдийн чиглэлийг тохирно. Код бичихээс өмнө шийдлээ баталгаажуулна.' },
  { title: 'Бүтээх', text: 'Интерфэйс, өгөгдөл, хэрэгтэй үйлдлүүдийг хөгжүүлж, явцыг үе шаттай харуулна. Санал хүсэлтийг ажлын явцад тусгана.' },
  { title: 'Шалгах, нийтлэх', text: 'Дэлгэц бүр дээр шалгаж, эцсийн засварыг хийнэ. Эх код, ашиглах заавар, шинэчлэх урсгалыг хүлээлгэн өгнө.' },
]
export const stack = [
  { label: 'Frontend', items: ['React', 'TypeScript', 'Tailwind CSS', 'Vite', 'Next.js'] },
  { label: 'Backend / Data', items: ['PostgreSQL', 'Prisma', 'REST API', 'OAuth'] },
  { label: 'Tools / Delivery', items: ['Git', 'GitHub', 'Cloudflare', 'Vercel', 'CI/CD'] },
]
export const projectTypes = [
  { value: 'landing', label: 'Landing Page' }, { value: 'business', label: 'Business Website' },
  { value: 'fullstack', label: 'Full-stack System' }, { value: 'redesign', label: 'Redesign' }, { value: 'other', label: 'Бусад' },
]
/**
 * Official B-T-B-N Web business channels.
 *
 * These are business accounts, not personal ones. Only add a channel here once the
 * real account exists — nothing on this list is a placeholder. `phone` stays empty
 * deliberately: no private number is published. Do not add a home address, birthday,
 * school or any personal social account.
 *
 * `pending` lists channels that are planned but not live; those render as plain text,
 * never as links. It is empty now that all four official channels are live.
 */
export const contact = {
  name: 'Батбаясгалан',
  email: 'btbnweb@gmail.com',
  phone: '',
  socials: [
    { label: 'GitHub', href: 'https://github.com/btbnweb-dev?tab=repositories' },
    { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=61594587243741' },
    { label: 'Instagram', href: 'https://www.instagram.com/btbn_web/' },
  ],
  pending: [] as string[],
}
