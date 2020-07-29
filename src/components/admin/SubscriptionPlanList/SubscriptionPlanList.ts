import { Component, Prop, Watch, Vue } from 'vue-property-decorator'
import { State, Getter, Mutation } from 'vuex-class'

import './SubscriptionPlanList.scss'

import store from '../../../store'

import { StripeCheckout } from 'vue-stripe-checkout'

import { STRIPE_PUBLISHABLE_KEY } from '../../../constants'

@Component({
    template: require('./SubscriptionPlanList.html'),
    name: 'SubscriptionPlanList',
    components: {
        StripeCheckout
    }
})

export class SubscriptionPlanList extends Vue {
    @State subscription_plans
    @State subscription
    @State admin

    successUrl = `${window.location.origin}/dashboard`
    cancelUrl = `${window.location.origin}/dashboard`
    publishableKey = STRIPE_PUBLISHABLE_KEY
    items = []

    $refs: {
        checkoutRef: any
    }

    get subscriptionPlanIndex() {
        return this.subscription_plans.findIndex(sp => sp.id === this.subscription.product.id)
    }

    get clientReferenceId() {
        return this.admin.stripe_cust_id
    }

    get customerEmail() {
        return this.admin.email
    }

    redirectToCheckout(index) {
        this.$refs.checkoutRef[index].redirectToCheckout()
    }

    mounted() {
        store.dispatch('getSubscriptionPlans')
    }
}
