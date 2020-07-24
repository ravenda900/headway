export const BASE_URL: string = window.location.host === 'localhost:8080'
    ? 'http://localhost:5000'
    : window.location.origin

export const STRIPE_PUBLISHABLE_KEY = 'pk_test_51H7mptIVvM8zimDuPVOYQ4TwtQC5xQNj4ETWPU9PJZW7TcEDo6StW4rL7aPaJw8uhTDWAbATLpoP2wyQmWNG0yx900nTnc77V2'