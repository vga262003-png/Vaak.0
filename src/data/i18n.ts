import { AppLanguage } from '../types/app';
import { LANGUAGES_81 } from './languages50';

export interface TranslationBundle {
  dir: 'ltr' | 'rtl';
  nativeLabel: string;
  tagline: string;
  acceptPermissions: string;
  termsHeading: string;
  loginTitle: string;
  sendOtp: string;
  verifyOtp: string;
  passwordLogin: string;
  duressPinLabel: string;
  modeOnline: string;
  modeMesh: string;
  modeSonic: string;
  tabHome: string;
  tabRadar: string;
  tabWalkie: string;
  tabRooms: string;
  tabContacts: string;
  tabSettings: string;
  tabSecurity: string;
  tabWorld: string;
  familyPinned: string;
  radarHeading: string;
  sosSlidePrompt: string;
  sosActivePrompt: string;
  pttHold: string;
  pttActive: string;
  normalCallTitle: string;
  quickSignalsTitle: string;
  guestBridgeTitle: string;
  roomsTitle: string;
  createRoom: string;
  joinRoom: string;
  settingsTitle: string;
  amoledMode: string;
  sunlightMode: string;
  fontStyle: string;
  fontSize: string;
  sponsoredLabel: string;
}

const RTL_LANGS = new Set(['ar', 'ur', 'fa', 'ps', 'prs', 'he', 'sd', 'ks']);

export const TRANSLATIONS: Record<string, TranslationBundle> = {
  en: {
    dir: 'ltr',
    nativeLabel: 'English',
    tagline: 'Resilient Mesh & Disaster Survival Communication',
    acceptPermissions: 'Accept & Grant All Permissions',
    termsHeading: 'Unified Consent & Survival Protocol',
    loginTitle: 'International Dual Access',
    sendOtp: 'Send Verification OTP',
    verifyOtp: 'Verify & Enter',
    passwordLogin: 'Sign In with Password',
    duressPinLabel: 'Duress PIN',
    modeOnline: '🟢 Online Mode',
    modeMesh: '⚡ Offline Mode',
    modeSonic: 'Sonic Wave',
    tabHome: 'Home',
    tabRadar: 'Radar & Map',
    tabWalkie: 'Walkie-Talkie',
    tabRooms: 'PIN Rooms',
    tabContacts: 'Phonebook',
    tabSettings: 'Settings',
    tabSecurity: 'Security Lab',
    tabWorld: 'Global Relays',
    familyPinned: 'Pinned Family Circle',
    radarHeading: '20km Proximity Radar',
    sosSlidePrompt: 'Slide right for Emergency SOS',
    sosActivePrompt: 'SOS Distress Broadcast Active',
    pttHold: 'Hold to Talk (Unlimited)',
    pttActive: 'Transmitting Live Voice...',
    normalCallTitle: 'Signal-Smart Voice & HD Video Call',
    quickSignalsTitle: '12 Quick Help Picture Icons',
    guestBridgeTitle: 'Zero-Install Guest QR Bridge',
    roomsTitle: '6-Digit PIN Rooms & Groups',
    createRoom: 'Create PIN Room',
    joinRoom: 'Join by 6-Digit PIN',
    settingsTitle: 'Display, Power & Security',
    amoledMode: 'AMOLED Black Battery Saver',
    sunlightMode: 'Sunlight High-Contrast Mode',
    fontStyle: 'Font Style',
    fontSize: 'Text Size',
    sponsoredLabel: 'Sponsored · Disaster Preparedness Partner',
  },
  hi: {
    dir: 'ltr',
    nativeLabel: 'हिन्दी',
    tagline: 'आपदा-रोधी मेश और आपातकालीन संचार',
    acceptPermissions: 'स्वीकार करें और सभी अनुमतियाँ दें',
    termsHeading: 'एकीकृत सहमति और सुरक्षा प्रोटोकॉल',
    loginTitle: 'अंतर्राष्ट्रीय दोहरा लॉगिन',
    sendOtp: 'OTP भेजें',
    verifyOtp: 'सत्यापित करें और प्रवेश करें',
    passwordLogin: 'पासवर्ड से लॉगिन करें',
    duressPinLabel: 'संकट (Duress) पिन',
    modeOnline: '🟢 ऑनलाइन मोड',
    modeMesh: '⚡ ऑफलाइन मेश मोड',
    modeSonic: 'सोनिक वेव',
    tabHome: 'होम',
    tabRadar: 'रडार व मैप',
    tabWalkie: 'वॉकी-टॉकी',
    tabRooms: 'पिन रूम',
    tabContacts: 'फोनबुक',
    tabSettings: 'सेटिंग्स',
    tabSecurity: 'सुरक्षा लैब',
    tabWorld: 'ग्लोबल रिले',
    familyPinned: 'प्रमुख पारिवारिक सदस्य',
    radarHeading: '20 किमी रेंज रडार',
    sosSlidePrompt: 'आपातकालीन SOS के लिए स्लाइड करें',
    sosActivePrompt: 'SOS आपातकालीन अलर्ट सक्रिय',
    pttHold: 'बोलने के लिए दबाए रखें',
    pttActive: 'लाइव आवाज़ प्रसारित हो रही है...',
    normalCallTitle: 'सिग्नल-स्मार्ट वॉइस व एचडी वीडियो कॉल',
    quickSignalsTitle: '12 चित्र-आधारित त्वरित संकेत',
    guestBridgeTitle: 'बिना ऐप के गेस्ट QR ब्रिज',
    roomsTitle: '6-अंकीय पिन रूम और समूह',
    createRoom: 'नया पिन रूम बनाएँ',
    joinRoom: '6-अंकीय पिन से जुड़ें',
    settingsTitle: 'डिस्प्ले, बैटरी और सुरक्षा',
    amoledMode: 'AMOLED ब्लैक बैटरी सेवर',
    sunlightMode: 'धूप उच्च-कंट्रास्ट मोड',
    fontStyle: 'फ़ॉन्ट शैली',
    fontSize: 'अक्षर आकार',
    sponsoredLabel: 'प्रायोजित · आपदा तैयारी भागीदार',
  },
  sa: {
    dir: 'ltr',
    nativeLabel: 'संस्कृतम्',
    tagline: 'आपत्कालीन-जालसंचारः जीवनरक्षणम् च',
    acceptPermissions: 'स्वीकुर्वन्तु सर्वाधिकारान् च प्रयच्छन्तु',
    termsHeading: 'एकीकृत-सहमतिः सुरक्षा-विधिः च',
    loginTitle: 'अन्ताराष्ट्रिय-प्रवेशद्वारम्',
    sendOtp: 'प्रमाणीकरण-OTP प्रेषयतु',
    verifyOtp: 'सत्याप्य प्रविशतु',
    passwordLogin: 'कूटशब्देन प्रविशतु',
    duressPinLabel: 'संकट-पिन (Duress)',
    modeOnline: '🟢 ऑनलाइन-क्रमः',
    modeMesh: '⚡ ऑफलाइन-जालक्रमः',
    modeSonic: 'ध्वनि-तरङ्गः',
    tabHome: 'मुख्यम्',
    tabRadar: 'दूरसंवेदी-रडार',
    tabWalkie: 'वाकी-टाकी',
    tabRooms: 'गोष्ठी-कक्षः',
    tabContacts: 'सम्पर्क-सूची',
    tabSettings: 'विन्यासाः',
    tabSecurity: 'सुरक्षा-प्रयोगशाला',
    tabWorld: 'वैश्विक-केन्द्रम्',
    familyPinned: 'कुल-परिवारीण-मण्डलम्',
    radarHeading: '२० किमी परिधि-रडार',
    sosSlidePrompt: 'आपातकालीन-SOS निमित्तं सर्पयतु',
    sosActivePrompt: 'आपात-संकेतः सक्रियः',
    pttHold: 'वक्तुं धारयतु',
    pttActive: 'ध्वनिः संप्रसार्यते...',
    normalCallTitle: 'ध्वनि-दृश्य-संवादः',
    quickSignalsTitle: '१२ चित्र-सहायता-चिह्नानि',
    guestBridgeTitle: 'अतिथये QR सेतुः',
    roomsTitle: '६-अङ्क-गोष्ठी-कक्षाः',
    createRoom: 'नूतनं कक्षं रचयतु',
    joinRoom: '६-अङ्क-पिन योजयतु',
    settingsTitle: 'प्रदर्शनम्, ऊर्जा, सुरक्षा च',
    amoledMode: 'AMOLED ऊर्जा-संरक्षकः',
    sunlightMode: 'सूर्यप्रकाश-उच्च-कंट्रास्ट-क्रमः',
    fontStyle: 'अक्षर-शैली',
    fontSize: 'अक्षर-प्रमाणम्',
    sponsoredLabel: 'आपत्कालीन-सहभागी',
  },
  mr: {
    dir: 'ltr',
    nativeLabel: 'मराठी',
    tagline: 'आपत्कालीन मेश व जीवनरक्षक संवाद',
    acceptPermissions: 'सर्व परवानग्या द्या',
    termsHeading: 'सुरक्षा व आपत्ती नियम',
    loginTitle: 'आंतरराष्ट्रीय लॉगिन',
    sendOtp: 'OTP पाठवा',
    verifyOtp: 'तपासा आणि प्रवेश करा',
    passwordLogin: 'पासवर्डने लॉगिन करा',
    duressPinLabel: 'संकट पिन',
    modeOnline: '🟢 ऑनलाइन मोड',
    modeMesh: '⚡ ऑफलाइन मेश मोड',
    modeSonic: 'सोनिक वेव्ह',
    tabHome: 'होम',
    tabRadar: 'रडार व नकाशा',
    tabWalkie: 'वॉकी-टॉकी',
    tabRooms: 'पिन रूम्स',
    tabContacts: 'फोनबुक',
    tabSettings: 'सेटिंग्ज',
    tabSecurity: 'सुरक्षा लॅब',
    tabWorld: 'ग्लोबल रिले',
    familyPinned: 'कुटुंब सदस्य',
    radarHeading: '२० किमी रेंज रडार',
    sosSlidePrompt: 'SOS साठी उजवीकडे सरकवा',
    sosActivePrompt: 'SOS अलर्ट सुरू आहे',
    pttHold: 'बोलण्यासाठी दाबून ठेवा',
    pttActive: 'आवाज प्रसारित होत आहे...',
    normalCallTitle: 'सिग्नल-स्मार्ट कॉल',
    quickSignalsTitle: '१२ चित्र संकेत',
    guestBridgeTitle: 'गेस्ट QR ब्रिज',
    roomsTitle: '६-अंकी पिन रूम्स',
    createRoom: 'रूम तयार करा',
    joinRoom: 'पिनने सामील व्हा',
    settingsTitle: 'डिस्प्ले, बॅटरी व सुरक्षा',
    amoledMode: 'AMOLED बॅटरी सेव्हर',
    sunlightMode: 'सूर्यप्रकाश हाय-कॉन्ट्रास्ट मोड',
    fontStyle: 'फॉन्ट शैली',
    fontSize: 'अक्षर आकार',
    sponsoredLabel: 'प्रायोजित भागीदार',
  },
  es: {
    dir: 'ltr',
    nativeLabel: 'Español',
    tagline: 'Red Mesh Resiliente y Supervivencia ante Desastres',
    acceptPermissions: 'Aceptar y Conceder Permisos',
    termsHeading: 'Consentimiento Unificado y Protocolo',
    loginTitle: 'Acceso Dual Internacional',
    sendOtp: 'Enviar Código OTP',
    verifyOtp: 'Verificar y Entrar',
    passwordLogin: 'Iniciar con Contraseña',
    duressPinLabel: 'PIN de Coacción',
    modeOnline: '🟢 Modo En Línea',
    modeMesh: '⚡ Modo Malla Offline',
    modeSonic: 'Onda Sónica',
    tabHome: 'Inicio',
    tabRadar: 'Radar y Mapa',
    tabWalkie: 'Walkie-Talkie',
    tabRooms: 'Salas PIN',
    tabContacts: 'Contactos',
    tabSettings: 'Ajustes',
    tabSecurity: 'Lab de Seguridad',
    tabWorld: 'Nodos Globales',
    familyPinned: 'Círculo Familiar',
    radarHeading: 'Radar de Proximidad 20km',
    sosSlidePrompt: 'Desliza para SOS de Emergencia',
    sosActivePrompt: 'Alerta SOS Activa',
    pttHold: 'Mantén para Hablar',
    pttActive: 'Transmitiendo Voz en Vivo...',
    normalCallTitle: 'Llamada Inteligente HD y Audio',
    quickSignalsTitle: '12 Iconos de Ayuda Rápida',
    guestBridgeTitle: 'Puente QR Sin Instalación',
    roomsTitle: 'Salas con PIN de 6 Dígitos',
    createRoom: 'Crear Sala PIN',
    joinRoom: 'Unirse con PIN',
    settingsTitle: 'Pantalla, Batería y Seguridad',
    amoledMode: 'Ahorro Negro AMOLED',
    sunlightMode: 'Modo Alto Contraste Solar',
    fontStyle: 'Estilo de Fuente',
    fontSize: 'Tamaño de Texto',
    sponsoredLabel: 'Patrocinado · Equipo de Emergencia',
  },
  ar: {
    dir: 'rtl',
    nativeLabel: 'العربية',
    tagline: 'شبكة تواصل عالمية للطوارئ والنجاة من الكوارث',
    acceptPermissions: 'موافقة ومنح جميع الصلاحيات',
    termsHeading: 'بروتوكول الموافقة والسلامة الموحد',
    loginTitle: 'دخول دولي مزدوج',
    sendOtp: 'إرسال رمز التحقق',
    verifyOtp: 'تحقق ودخول',
    passwordLogin: 'تسجيل الدخول بكلمة المرور',
    duressPinLabel: 'رمز الطوارئ السري',
    modeOnline: '🟢 وضع الاتصال المباشر',
    modeMesh: '⚡ وضع شبكة الأوفلاين',
    modeSonic: 'موجة صوتية',
    tabHome: 'الرئيسية',
    tabRadar: 'الرادار والخريطة',
    tabWalkie: 'اللاسلكي',
    tabRooms: 'غرف الرمز السري',
    tabContacts: 'سجل الأسماء',
    tabSettings: 'الإعدادات',
    tabSecurity: 'مختبر الأمان',
    tabWorld: 'المحطات العالمية',
    familyPinned: 'دائرة العائلة المثبتة',
    radarHeading: 'رادار القرب 20 كم',
    sosSlidePrompt: 'اسحب لإرسال استغاثة طارئة',
    sosActivePrompt: 'بث الاستغاثة SOS نشط الآن',
    pttHold: 'اضغط مطولاً للتحدث',
    pttActive: 'جاري البث الصوتي المباشر...',
    normalCallTitle: 'مكالمة ذكية بصوت وصورة HD',
    quickSignalsTitle: '12 أيقونة نجدة سريعة',
    guestBridgeTitle: 'جسر QR للضيوف بدون تثبيت',
    roomsTitle: 'غرف برمز 6 أرقام',
    createRoom: 'إنشاء غرفة جديدة',
    joinRoom: 'انضمام برمز 6 أرقام',
    settingsTitle: 'العرض والطاقة والأمان',
    amoledMode: 'وضع توفير الطاقة AMOLED',
    sunlightMode: 'وضع التباين العالي تحت الشمس',
    fontStyle: 'نوع الخط',
    fontSize: 'حجم الخط',
    sponsoredLabel: 'برعاية · شريك الاستعداد للطوارئ',
  },
  zh: {
    dir: 'ltr',
    nativeLabel: '中文 (普通话)',
    tagline: '韧性网状网络与灾难求生通信',
    acceptPermissions: '接受并授予全部权限',
    termsHeading: '统一授权与生存安全协议',
    loginTitle: '全球双重认证登录',
    sendOtp: '发送验证码 OTP',
    verifyOtp: '验证并进入',
    passwordLogin: '密码登录',
    duressPinLabel: '胁迫报警 PIN',
    modeOnline: '🟢 在线模式',
    modeMesh: '⚡ 离线自组网模式',
    modeSonic: '声波载波',
    tabHome: '首页',
    tabRadar: '雷达与地图',
    tabWalkie: '对讲机',
    tabRooms: 'PIN 群组',
    tabContacts: '通讯录',
    tabSettings: '设置',
    tabSecurity: '安全实验室',
    tabWorld: '全球中继',
    familyPinned: '常用家人圈',
    radarHeading: '20公里范围雷达',
    sosSlidePrompt: '向右滑动发起紧急 SOS',
    sosActivePrompt: 'SOS 求救信号已激活',
    pttHold: '按住通话 (无限制)',
    pttActive: '正在实时传输语音...',
    normalCallTitle: '信号自适应高清视频与语音通话',
    quickSignalsTitle: '12项图元求助图标',
    guestBridgeTitle: '免安装访客 QR 桥接',
    roomsTitle: '6位数 PIN 密闭房间',
    createRoom: '新建 PIN 房间',
    joinRoom: '输入6位 PIN 加入',
    settingsTitle: '显示、电量与安全设置',
    amoledMode: 'AMOLED 纯黑省电模式',
    sunlightMode: '阳光高对比度模式',
    fontStyle: '字体风格',
    fontSize: '文字大小',
    sponsoredLabel: '防灾应急赞助伙伴',
  },
};

// Complete translation resolver for all 81 languages
export function getTranslation(langCode: string): TranslationBundle {
  if (TRANSLATIONS[langCode]) {
    return TRANSLATIONS[langCode];
  }

  // Fallback to English base, but customize native label and direction
  const foundMeta = LANGUAGES_81.find((l) => l.code === langCode);
  const isRtl = RTL_LANGS.has(langCode);
  const base = TRANSLATIONS.en;

  return {
    ...base,
    dir: isRtl ? 'rtl' : 'ltr',
    nativeLabel: foundMeta ? foundMeta.native : langCode.toUpperCase(),
  };
}
