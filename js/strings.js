// All UI text. No UI text inside logic files.
export const S = {
  appName: 'MedDo',
  disclaimer: 'המערכת עוזרת לארגן ולעקוב, ואינה מחליפה ייעוץ רפואי',
  nav: {
    label: 'ניווט ראשי',
    home: 'בית',
    issues: 'נושאים',
    tasks: 'משימות',
  },
  logout: 'יציאה',
  back: 'חזרה',
  save: 'שמירה',
  cancel: 'ביטול',
  addInfo: 'הוספת מידע',
  login: {
    title: 'כניסה',
    email: 'אימייל',
    password: 'סיסמה',
    submit: 'כניסה',
    submitting: 'נכנסים...',
    error: 'לא הצלחנו להיכנס. כדאי לבדוק את האימייל והסיסמה ולנסות שוב.',
    missing: 'צריך למלא אימייל וסיסמה.',
  },
  home: { title: 'שלום, הנה מה שדורש תשומת לב היום' },
  issues: { title: 'נושאים' },
  tasks: { title: 'משימות ומעקבים' },
  loadError: 'משהו לא נטען כמו שצריך. כדאי לרענן את הדף.',

  // Screen 3 · add info
  add: {
    title: 'הוספת מידע',
    intro: 'אפשר להעלות קובץ, לצלם מסמך או להקליד טקסט. אנחנו נקרא ונציע מה לעשות איתו.',
    uploadTitle: 'העלאת קובץ',
    uploadHint: 'קובץ או תמונה מהמכשיר',
    cameraTitle: 'צילום מסמך',
    cameraHint: 'מהמצלמה בטלפון',
    textLabel: 'או טקסט חופשי',
    textPlaceholder: 'הקלדה או הדבקה',
    analyze: 'ניתוח',
    textEmpty: 'צריך להקליד או להדביק טקסט כדי לנתח אותו',
    textCount: (n, max) => `${n.toLocaleString('he-IL')} מתוך ${max.toLocaleString('he-IL')} תווים`,
    retry: 'לנסות שוב',
  },

  // Screen 4 · analyzing
  analyzing: {
    title: 'ניתוח המסמך',
    heading: 'מנתחים את המסמך',
    text: 'קוראים את מה שכתוב, מסווגים אותו ומחפשים משימות שצריך לעקוב אחריהן',
  },

  // Screen 12 · unreadable
  unreadable: {
    title: 'ניתוח המסמך',
    heading: 'לא הצלחנו לקרוא את המסמך',
    text: 'אפשר לצלם שוב באור טוב יותר, או להקליד את מה שכתוב',
    again: 'צילום או העלאה מחדש',
    asText: 'הקלדה כטקסט חופשי',
  },

  // Client-side messages for the add flow, by situation
  addErrors: {
    unsupported: 'אפשר להעלות תמונה או קובץ PDF',
    openFailed: 'לא הצלחנו לפתוח את הקובץ. אפשר לנסות קובץ אחר או לצלם שוב',
    too_large: 'הקובץ גדול מדי. אפשר לבחור קובץ קטן יותר',
    uploadFailed: 'לא הצלחנו להעלות את הקובץ. אפשר לנסות שוב בעוד רגע',
    unavailable: 'השירות לא זמין כרגע. אפשר לנסות שוב בעוד רגע',
    bad_request: 'משהו השתבש בשליחה. אפשר לנסות שוב',
  },

  // Screen 5 · review
  review: {
    title: 'אישור המידע',
    showOriginal: 'הצג את המסמך המקורי',
    question: 'זיהינו את הצעדים הבאים. הכל נראה נכון?',
    fields: {
      content_type: 'סוג תוכן',
      specialty: 'תחום מומחיות',
      doc_date: 'תאריך',
      provider: 'גורם מטפל',
      key_info: 'מידע מרכזי',
    },
    edit: (name) => `עריכת ${name}`,
    unknown: 'לא ידוע',
    notFound: 'את זה לא מצאנו במסמך. אפשר להשלים כאן',
    uncertain: 'לא בטוחים שקראנו נכון. כדאי להציץ במקור',
    choose: 'בחירה',
    issueLabel: 'שיוך לבעיה רפואית (חובה)',
    issueFieldName: 'שיוך לבעיה רפואית',
    issueNone: 'לא מצאנו בעיה מתאימה. אפשר לבחור מהרשימה או לפתוח בירור חדש',
    issueSuggested: 'הצעה',
    issueNew: 'חדש',
    issueClosed: '(סגור)',
    newIssue: 'או + בירור חדש',
    issueRequired: 'צריך לבחור בעיה רפואית או לפתוח בירור חדש',
    tasksTitle: 'משימות שהוצעו',
    tasksCount: (n) => `${n} משימות`,
    noTasks: 'לא מצאנו במסמך משימות לעקוב אחריהן',
    taskDelete: (d) => `מחיקת המשימה: ${d}`,
    taskEdit: (d) => `עריכת המשימה: ${d}`,
    taskDesc: 'תיאור המשימה',
    taskType: 'סוג',
    taskStatus: 'סטטוס',
    taskDue: 'תאריך יעד',
    taskTime: 'שעה (לתור)',
    dueBy: (d) => `עד ${d}`,
    dueUnknown: 'תאריך יעד לא ידוע',
    descRequired: 'צריך לכתוב מה המשימה',
    typeRequired: 'צריך לבחור סוג',
    dueRequired: 'צריך תאריך כדי לשמור',
    fixErrors: 'יש כמה פרטים להשלים לפני השמירה. סימנו אותם למעלה',
    submit: 'אישור ושמירה',
    saving: 'שומרים...',
    saveFailed: 'לא הצלחנו לשמור. אפשר לנסות שוב, ומה שכבר נשמר לא יישמר פעמיים',
  },

  // Screen 6 · original document
  original: {
    title: 'המסמך המקורי',
    imageAlt: 'המסמך שהועלה',
    openFile: 'פתיחת הקובץ',
    openFailed: 'לא הצלחנו לפתוח את הקובץ. אפשר לנסות שוב',
  },

  // Screen 11 · new issue
  issueForm: {
    title: 'בירור חדש',
    intro: 'בירור הוא בעיה רפואית אחת, שכל המסמכים והמשימות שלה נאספים תחתיה',
    name: 'שם',
    namePlaceholder: 'כאבי גב תחתון',
    status: 'סטטוס',
    nextStep: 'צעד הבא',
    nextStepPlaceholder: 'לקבוע תור לאורתופד',
    nameRequired: 'צריך לתת שם לבירור',
    saveFailed: 'לא הצלחנו לשמור. אפשר לנסות שוב',
  },
};
