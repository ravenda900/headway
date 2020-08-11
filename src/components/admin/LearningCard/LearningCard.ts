import { Component, Prop, Vue, Watch, Inject } from 'vue-property-decorator'
import { State, Getter, Mutation } from 'vuex-class'

import * as vue2Dropzone from 'vue2-dropzone'

import './LearningCard.scss'

import { ProgressBar } from '../../shared/ProgressBar'
import { QuizBuilder } from '../QuizBuilder'
import { AudioPlayer } from '../../shared/AudioPlayer'
import { Quiz } from '../../student/Quiz'
import store from '../../../store'
import { BASE_URL } from '../../../constants'
import Axios from 'axios'


@Component({
    template: require('./LearningCard.html'),
    name: 'LearningCard',
    components: {
        ProgressBar,
        QuizBuilder,
        Quiz,
        AudioPlayer,
        vueDropzone: vue2Dropzone
    }
})
export class LearningCard extends Vue {
    @Inject() toggleModal

    quizVisible = false
    taskVisible = false

    @Getter currentCard
    @State route
    @State courses

    name = ''
    ready = false
    content = ''
    evidence = ''
    quiz = []
    audioUploadPercent = 0
    videoUploadPercent = 0
    videoIsUploading = false

    sharedConfig = {
        key: 'OD2G2D4I4D3A13hC7D6C5D4D2E3J4C6A6C6cgsmtJ2C8eheE5kC-8==',
        iconsTemplate: 'font_awesome_5',
        pastePlain: true,
        fontSizeSelection: true,
        fontSize: [
            '20',
            '18',
            '16'
        ],
        charCounterCount: false,
        quickInsertTags: [''],
        // WARNING! These fields are not even named correctly. See from docs they should be:
        // • imageUploadURL is the URL where the upload request is being made.
        // • imageUploadMethod is the HTTP request type.
        // fileUpload: true,
        // fileUploadMethod: 'PUT',
        // fileUploadURL: '/api/card/2',
        toolbarButtons: [
            'undo',
            'redo',
            '|',
            'fontSize',
            'bold',
            'italic',
            'underline',
            'outdent',
            'indent',
            'clearFormatting',
            '|',
            'insertImage'
        ],
        imageInsertButtons: [
            'imageBack',
            '|',
            'imageUpload',
            'imageByURL'
        ]
    }

    contentConfig = Object.assign({}, this.sharedConfig, {
        placeholderText: 'Start writing',
        height: 400,
        events: {
            'froalaEditor.image.beforeUpload': function(e, editor, files) {
                if (files.length) {
                    // Create a File Reader.
                    const reader = new FileReader()
      
                    // Set the reader to insert images when they are loaded.
                    reader.onload = function (e) {
                        const target = <any>e.target
                        const result = target.result
                        editor.image.insert(result, null, null, editor.image.get())
                        console.log('yay')
                    }
      
                    // Read image as base64.
                    reader.readAsDataURL(files[0])
                }
      
                editor.popups.hideAll()
      
                // Stop default upload chain.
                return false
            },
            'froalaEditor.contentChanged': (e, editor) => {
                this.content = editor.html.get()
                setTimeout(() => {
                    this.save()
                }, 500)
            }
        }
    })

    evidenceConfig = Object.assign({}, this.sharedConfig, {
        placeholderText: 'Ask your users to perform a practical task related to the content in this card',
        height: 150,
        events: {
            'froalaEditor.image.beforeUpload': function(e, editor, files) {
                if (files.length) {
                    // Create a File Reader.
                    const reader = new FileReader()
      
                    // Set the reader to insert images when they are loaded.
                    reader.onload = function (e) {
                        const target = <any>e.target
                        const result = target.result
                        editor.image.insert(result, null, null, editor.image.get())
                        console.log('yay')
                    }
      
                    // Read image as base64.
                    reader.readAsDataURL(files[0])
                }
      
                editor.popups.hideAll()
      
                // Stop default upload chain.
                return false
            },
            'froalaEditor.contentChanged': (e, editor) => {
                this.evidence = editor.html.get()
                setTimeout(() => {
                    this.save()
                }, 500)
            }
        }
    })

    $refs: {
        audio: HTMLAudioElement
        AudioDropzone: any
        video: HTMLVideoElement
        mobileVideo: HTMLVideoElement
        VideoDropzone: any
        name: HTMLInputElement
        player: AudioPlayer
    }

    @Watch('currentCard', { deep: true })
    watchCurrentCard(newVal, oldVal) {
        if (newVal && newVal.content) {
            this.content = newVal.content
        }
        if (newVal && newVal.evidence_task) {
            this.evidence = newVal.evidence_task
        }
        if (newVal && newVal.quiz) {
            this.quiz = JSON.parse(newVal.quiz)
        }
        if (newVal && newVal.name) {
            this.name = newVal.name
        }
        if (newVal && newVal.video) {
            this.$nextTick(() => {
                this.updateVideoSrc()
            })
        }
        if (newVal && newVal.audio) {
            this.$nextTick(() => {
                this.updateAudioSrc()
            })
        }
    }

    @Watch('$route', { deep: true})
    watchRoute(newVal, oldVal) {
        this.updateRoute(newVal)
    }

    audioDropzoneOptions = {
        url: BASE_URL + '/admin/upload/audio',
        thumbnailWidth: 150,
        timeout: 99999999,
        maxFiles: 1,
    }

    videoDropzoneOptions = {
        url: BASE_URL + '/admin/upload/audio',
        thumbnailWidth: 150,
        maxFiles: 1,
        maxFilesize: 512, // mb
        timeout: 99999999,
        uploadprogress: this.videoUploadProgress
    }

    awss3 = {
        signingURL: this.signingUrl,
        headers: {},
        params : {},
        sendFileToServer : false, // switching to false causes issues. try again
        withCredentials: false
    }

    updateVideoSrc() {
        if (!this.currentCard.video) {
            console.log('abort updateVideoSrc', this.currentCard.video)
            return
        }
        Axios.get(BASE_URL + '/admin/card/' + this.currentCard.id + '/video').then(d => {
            // console.log(d.data)
            if (this.$refs.video) {
                this.$refs.video.setAttribute('src', d.data)
            }
            if (this.$refs.mobileVideo) {
                this.$refs.mobileVideo.setAttribute('src', d.data)
            }
        })
    }

    updateAudioSrc() {
        if (!this.currentCard.audio) {
            console.log('abort updateAudioSrc', this.currentCard.audio)
            return
        }
        Axios.get(BASE_URL + '/admin/card/' + this.currentCard.id + '/audio').then(d => {
            // console.log(d.data)
            if (this.$refs.audio) {
                this.$refs.audio.setAttribute('src', d.data)
            }
            if (this.$refs.player) {
                this.$refs.player.audioSrc = d.data
            }
        })
    }

    videoUploadProgress(file, percent, size) {
    // console.log('percent', percent)
        this.videoUploadPercent = Math.round(percent)
    }

    signingUrl(f) {
        return BASE_URL + '/s3-policy?format=video&file=' + f.name + '&cardId=' + + this.currentCard.id
    }

    s3UploadError(errorMessage) {
        console.log('s3UploadError', {errorMessage})
    }

    s3UploadSuccess(s3ObjectLocation) {
        console.log('s3UploadSuccess', {s3ObjectLocation})
    }

    sendingEvent(file, xhr, formData) {
        this.videoIsUploading = true
    }

    audioSendingEvent(file, xhr, formData) {
    // console.log('audioSendingEvent')
        formData.append('cardId', this.currentCard.id)
    }

    audioUploadProgress(file, percent, size) {
    // console.log('percent', percent)
        this.audioUploadPercent = Math.round(percent)
    }

    audioSuccess(file) {
        const payload = {
            courseId: parseInt(this.route.params.courseId),
            unitId: parseInt(this.route.params.unitId),
            cardId: parseInt(this.route.params.cardId),
            file: file.name
        }
        this.$refs.AudioDropzone.removeAllFiles(true)
        store.commit('setActiveCardAudio', payload)
    }

    videoSuccess(file) {
        console.log('videoSuccess', file)
        this.videoIsUploading = false
        this.$refs.VideoDropzone.removeAllFiles(true)
        this.currentCard.video = file.name
        this.updateVideoSrc()
    // store.commit('setActiveCardVideo', payload) // WARNING: this overwrites content edited during upload
    }

    removeAudio() {
        store.commit('set', {
            key: 'removeAudioCardId',
            value: this.$route.params.cardId,
        })
        this.toggleModal('removeAudio')
    }

    removeVideo() {
        store.commit('set', {
            key: 'removeVideoCardId',
            value: this.$route.params.cardId,
        })
        this.toggleModal('removeVideo')
    }

    updateRoute(route) {
        store.dispatch('getAdmin').then(() => {
            store.dispatch('fetchUnit', parseInt(this.$route.params.unitId))
        })
    }

    fetchUnit() {
        store.dispatch('fetchUnit', parseInt(this.$route.params.unitId))
    }

    mounted() {
        this.updateRoute(this.$route)
        setTimeout(() => {
            this.ready = true
            this.$forceUpdate()
        }, 2000)
    }

    save() {
        if (!this.currentCard) {
            return
        }
        store.dispatch('updateActiveCard', {
            id: this.currentCard.id,
            name: this.name,
            evidence_task: this.evidence,
            content: this.content,
        })
    }
}
