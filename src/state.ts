export const state = {
    authed: false,
    dashboardLoading: true,
    // subscriptionStatus: null,
    socket: null,
    student: {
        courses: [],
    },
    courses: [],
    businesses: [],
    studentListFilter: 'business',
    admin: {
        name: '',
        email: ''
    },
    sidebarOpen: false,
    notification: {
        type: '',
        title: '',
        text: '',
    },
    activeStudentProfile: {},
    activeBusinessProfile: {
        students: []
    },
    activeStudentCard: {},
    user: {},
    breadcrumbs: [],
    modals: {
        addUnit: false,
        addStudent: false,
        addCourse: false,
        addBusiness: false,
        addBusinessCourse: false,
        card: false,
        addStudentCourse: false,
        addStudentBusiness: false,
        removeStudentCourse: false,
        removeStudentBusiness: false,
        removeCourse: false,
        removeStudent: false,
        removeBusiness: false,
        removeBusinessCourse: false,
        removeUnit: false,
        removeCard: false,
        removeVideo: false,
        removeAudio: false,
    },
    removeCourseId: null,
    removeUnitId: null,
    removeCardId: null,
    addCardUnitId: null,
    subscription: null,
    subscription_plans: [],
    storageUsage: null
}
