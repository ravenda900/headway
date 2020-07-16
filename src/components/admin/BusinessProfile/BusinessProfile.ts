import { Component, Prop, Vue, Watch, Inject } from 'vue-property-decorator'
import { State, Getter, Mutation } from 'vuex-class'

import { ProgressBar } from '../../shared/ProgressBar'
import { Breadcrumbs } from '../Breadcrumbs'

import { StudentTile } from '../StudentTile'

import './BusinessProfile.scss'
import store from '../../../store'

const crumbs = () => [
    {
        label: 'Your students',
        link: '/dashboard'
    }
]

@Component({
    template: require('./BusinessProfile.html'),
    name: 'BusinessProfile',
    components: {
        StudentTile,
    }
})

export class BusinessProfile extends Vue {

    @State courses
    @State breadcrumbs
    @State activeBusinessProfile

    editing = false
    businessName = ''

    @Inject() toggleModal

    loaded = false

    $refs: {
        businessName: HTMLTextAreaElement
    }

    @Watch('$route', { deep: true})
    watchRoute(newVal, oldVal) {
        this.updateRoute(newVal)
    }

    @Watch('activeBusinessProfile', { deep: true})
    watchBusinessProfile(newVal, oldVal) {
        if (newVal) {
            this.loaded = true
            this.businessName = newVal.name
        }
    }

    updateRoute(route) {
        const { params } = route
        store.dispatch('getBusinessProfile', parseInt(params.businessId))
    }

    confirmRemoveCourse(courseId) {
        store.commit('set', {
            key: 'removeBusinessCourseId',
            value: courseId,
        })
        this.toggleModal('removeBusinessCourse')
    }

    mounted() {
        this.updateRoute(this.$route)
    }

    edit() {
        this.editing = true
        this.$nextTick(() => {
            this.$refs.businessName.select()
        })
    }

    cancel() {
        this.businessName = this.activeBusinessProfile.name
        this.editing = false
    }

    save() {
        store.dispatch('editBusinessName', {
            businessId: this.activeBusinessProfile.id,
            name: this.businessName,
        }).then(() => {
            this.editing = false
            store.dispatch('getBusinessProfile', parseInt(this.$route.params.businessId))
        })
    }

}
