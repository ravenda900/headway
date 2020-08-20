import { Component, Prop, Watch, Vue, Provide } from 'vue-property-decorator'
import { State, Getter, Mutation } from 'vuex-class'

import * as moment from 'moment'

import { CourseService, BusinessService, StudentService, UnitService } from '../../../services'

import { AddStudent, AddStudentBusiness, AddStudentCourse, AddUnit, AddCard, AddBusiness, Breadcrumbs, StudentList, StudentProfile, Toast, BusinessProfile, LearningCard, Course, Businesses, CourseMenu, RemoveStudentCourse, RemoveStudentBusiness, AddCourse, RemoveCard, RemoveVideo, RemoveAudio, RemoveBusiness, RemoveStudent, RemoveCourse, RemoveUnit, RemoveBusinessCourse, AddBusinessCourse, SubscriptionPlanList } from '../../'

import { Login } from '../../shared/Login'
import { ProgressBar } from '../../shared/ProgressBar'

import './Admin.scss'
import store from '../../../store'
import axios from 'axios'

const toggleModal = k => store.commit('toggleModal', k)

@Component({
    template: require('./Admin.html'),
    name: 'Admin',
    directives: { focus: focus },
    components: {
        AddBusiness,
        AddBusinessCourse,
        AddCard,
        AddCourse,
        AddStudent,
        AddStudentBusiness,
        AddStudentCourse,
        AddUnit,
        Breadcrumbs,
        BusinessProfile,
        Course,
        CourseMenu,
        LearningCard,
        Login,
        RemoveAudio,
        RemoveBusiness,
        RemoveBusinessCourse,
        RemoveCard,
        RemoveCourse,
        RemoveStudent,
        RemoveStudentBusiness,
        RemoveStudentCourse,
        RemoveUnit,
        RemoveVideo,
        StudentList,
        StudentProfile,
        Toast,
        SubscriptionPlanList,
        ProgressBar
    }
})

export class Admin extends Vue {

    @Provide() studentService = new StudentService()
    @Provide() businessService = new BusinessService()
    @Provide() unitService = new UnitService()
    @Provide() toggleModal = toggleModal

    @Getter currentCourse
    @Getter registeredStudents
    @Getter pendingStudents
    @Getter subscriptionStatus

    @State courses
    @State businesses
    @State authed
    @State user
    @State modals
    @State breadcrumbs
    @State route
    @State admin
    @State sidebarOpen
    @State subscription
    @State dashboardLoading
    @State storageUsage
    ready = false

    @Watch('sidebarOpen')
    watchSidebarOpen(newVal, oldVal) {
        if (newVal) {
            document.addEventListener('click', this.toggleSidebar)
        } else {
            document.removeEventListener('click', this.toggleSidebar)
        }
    }

    $refs: {
        course: any
    }

    get isNotActive() {
        return this.subscriptionStatus !== 'active' && this.subscriptionStatus !== 'past_due'
    }

    get inviteButtonLabel() {
        return this.$route.name === 'course' ? 'Enrol Student' : 'Invite Student'
    }

    get totalStudents() {
        return this.registeredStudents.length + this.pendingStudents.length
    }

    get courseMenu() {
        if (this.courses) {
            const menu = this.courses.map((course, index) => {
                const data = {
                    text: course.name,
                    link: '/c/' + course.id,
                    total: course.units ? course.units.length : 0,
                }
                return data
            })
            return menu
        }
    }

    get businessMenu() {
        if (this.businesses) {
            // WARNING: always omit first business
            const menu = this.businesses.slice(1).map((business, index) => {
                const data = {
                    text: business.name,
                    link: '/b/' + business.id,
                    total: business.students ? business.students.length : 0,
                }
                return data
            })
            return menu
        }
    }

    get items() {
        return [{
            plan: this.subscription.plan.id,
            quantity: 1
        }]
    }

    get storageUsagePercentage() {
        return (this.storageUsage.sizeInBytes / this.subscription.product.metadata.storageInBytes) * 100
    }

    handleUnitAdded() {
        this.$refs.course.sortUnits()
    }

    inviteStudent() {
        this.$ua.trackEvent('Invite Student', 'Open Modal')
        toggleModal('addStudent')
    }

    removeStudent() {
        store.commit('set', {
            key: 'removeStudentId',
            value: this.$route.params.studentId
        })
        this.toggleModal('removeStudent')
    }

    removeBusiness() {
        store.commit('set', {
            key: 'removeBusinessId',
            value: this.$route.params.businessId
        })
        this.toggleModal('removeBusiness')
    }

    removeCourse() {
        store.commit('set', {
            key: 'removeCourseId',
            value: this.$route.params.courseId
        })
        this.toggleModal('removeCourse')
    }

    removeCard() {
        store.commit('set', {
            key: 'removeCardId',
            value: this.route.params.cardId
        })
        this.toggleModal('removeCard')
    }

    toggleSidebar() {
        store.commit('toggleSidebar')
    }

    async mounted() {
        const url = new URL(window.location.toString())
        
        const subscription = await store.dispatch('getSubscription')
        await store.dispatch('getAdmin')
        await store.dispatch('getSubscriptionProduct', subscription)
        await store.dispatch('getStorageUsage', subscription)

        this.ready = true
                    
        if (url.searchParams.has('session_id')) {
            const session = await store.dispatch('getCheckoutSession', url.searchParams.get('session_id'))
            if (!session.error) {
                this.$notify({
                    group: 'admin_notifs',
                    text: `You are now subscribed to ${subscription.product.name}`,
                    duration: 10000
                })
                url.searchParams.delete('session_id')
                window.history.pushState({}, document.title, url.href)
            }
        }
    }
}
