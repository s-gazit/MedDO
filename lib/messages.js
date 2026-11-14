// Error messages returned by the function, in Hebrew, in the brand tone. No raw provider text.
export const MESSAGES = {
  unreadable: 'לא הצלחנו לקרוא את המסמך',
  unavailable: 'השירות לא זמין כרגע. אפשר לנסות שוב בעוד רגע',
  bad_request: 'משהו בבקשה לא תקין. אפשר לנסות שוב',
  too_large: 'הקובץ גדול מדי. אפשר לבחור קובץ קטן יותר',
  unauthorized: 'צריך להיכנס שוב',
  forbidden_origin: 'הבקשה לא מורשית',
  method_not_allowed: 'הבקשה לא מורשית',
};

export const STATUS = {
  unreadable: 422,
  unavailable: 502,
  bad_request: 400,
  too_large: 413,
  unauthorized: 401,
  forbidden_origin: 403,
  method_not_allowed: 405,
};
