export const BASE_URL: string = window.location.host === 'localhost:8080'
    ? 'http://localhost:5000'
    : window.location.origin

export const STRIPE_PUBLSHABLE_KEY = 'pk_live_AAGCNw5v2LHWOE0Lc5eHAAsa'

export const PUSHER = {
    KEY: 'b3893e4536e003ed0924',
    CLUSTER: 'ap1'
}
