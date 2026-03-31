<script setup lang="ts">
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { color } from 'chart.js/helpers';
import { Doughnut } from 'vue-chartjs';
type question = {
    id: number,
    question: string,
    answers: string[],
    rightAnswer: number
}

interface QuestionArray extends Array<question> {

}

interface QuizJSON {
    course_id: number,
    title: String,
    questions: QuestionArray
}

type QuestionModel = Record<string, { answer?: string }>


interface Score {
    questions?: QuestionArray,
    answers?: QuestionModel,
    percentOfRight?: number,
};

const props = defineProps<{
    quizJSON: QuizJSON
}>()



const chartScore: Ref<Score | undefined> = ref();
const currentQuestion = ref(0);
const quiz: Ref<HTMLElement | undefined> = ref();
const score: Ref<HTMLElement | undefined> = ref();
const nextQuestion = () => {
    if (currentQuestion.value < props.quizJSON.questions.length - 1) {
        currentQuestion.value++;
    }
}

const lastQuestion = () => {
    if (currentQuestion.value > 0) {
        currentQuestion.value--;
    }
}

const questionsModelArray = ref(props.quizJSON.questions.reduce((acc: QuestionModel, curr: question) => {
    acc[String(curr.id)] = { answer: "" };
    return acc;
}, {} as QuestionModel));

const isScore = ref(false);
const chart = ref(null);


//валидация на пустые вопросы
const validateEmptyAnswers = (): number[] => {
    let emptyQuestions: number[] = [];
    for (let questionID in questionsModelArray.value) {
        if (questionsModelArray.value[questionID].answer !== undefined && questionsModelArray.value[questionID].answer === "") {
            emptyQuestions.push(Number(questionID));
        }
    }
    return emptyQuestions;
}

//проверка правильных ответов / возвращение процентов
const checkAnswers = (): number[] => {
    let percentOfRight = 0;
    let countOfRight = 0;
    for (let questionID in questionsModelArray.value) {
        if (questionsModelArray.value[questionID].answer !== undefined) {
            let question = props.quizJSON.questions.find(item => item.id === Number(questionID));
            let answerNumber = Number(questionsModelArray.value[questionID].answer?.split('/').pop());
            if (questionsModelArray.value[questionID].answer !== undefined && answerNumber === question?.rightAnswer) {
                countOfRight++;
            }
        }
    }
    let countOfQuestions = props.quizJSON.questions.length;
    if (countOfRight !== 0) {
        percentOfRight = (countOfRight / countOfQuestions) * 100;
    }
    return [percentOfRight, countOfRight, countOfQuestions];
}

const toast = useToast();

const printScore = () => {
    const emptyQuestions = validateEmptyAnswers();
    if (emptyQuestions.length > 0) {
        toast.add({
            title: `Вы ответили не на все вопросы! ${JSON.stringify(emptyQuestions)}`, ui: {
                background: 'bg-white dark:bg-neutral-900',
                progress: {
                    background: 'bg-black dark:bg-white',
                }
            }
        });
        currentQuestion.value = emptyQuestions[0];
        return
    }
    if (quiz.value !== undefined && quiz.value !== null) {
        let [percentOfRight, countOfRight, countOfQuestions] = checkAnswers();
        chartData.value.labels[0] = `Правильных ответов: ` + String(countOfRight);
        chartData.value.labels[1] = `Неправильных ответов: ` + String(countOfQuestions - countOfRight);
        chartData.value.datasets[0].data = [percentOfRight, 100 - percentOfRight];
        toast.add({
            title: `Поздравляем с прохождением теста, ваши ответы будут сохранены!`, ui: {
                background: 'bg-white dark:bg-neutral-900',
                progress: {
                    background: 'bg-black dark:bg-white',
                }
            }
        });
        isScore.value = true;
        chartScore.value = {
            questions: props.quizJSON.questions,
            answers: questionsModelArray.value,
            percentOfRight: percentOfRight,
        }
        console.log(chartScore.value);
    }
}

const isScoreOut = ref(false);

const resetScore = () => {
    currentQuestion.value = 0;
    isScoreOut.value = true;
    
    setTimeout(()=>{
        isScore.value = false;
        isScoreOut.value = false;
    }, 500)

    questionsModelArray.value = props.quizJSON.questions.reduce((acc: QuestionModel, curr: question) => {
        acc[String(curr.id)] = { answer: "" };
        return acc;
    }, {} as QuestionModel);
}


// данные 

const Score: Ref<Score | undefined> = ref();


ChartJS.register(ArcElement, Tooltip, Legend);
const chartData = computed(() => {
    return {
        labels: [`Правильных ответов: `, `Неправильных ответов: `],
        datasets: [
            {
                backgroundColor: ['#CECECE', '#798081'],
                data: [0, 0]
            }
        ]
    }
})



const options = {
    responsive: true,
    maintainAspectRatio: false
}

</script>


<template>
    <div class="w-full h-full relative">
        <div class="w-full h-full select-none relative justify-between p-11 overflow-y-hidden overflow-x-hidden bg-gray-100 dark:bg-zinc-800 flex flex-col items-center transition-all ease-[cubic-bezier(0.705,0.010,0.000,0.915)] duration-500"
            ref="quiz">
            <div :class="{ 'fadeOUT': isScore }"
                class="flex justify-center items-center max-w-full px-2 rounded-full h-fit dark:bg-white bg-black text-white dark:text-black">
                {{ (currentQuestion + 1) + "/" + quizJSON.questions.length }}
            </div>
            <div class="question py-2 border-t border-b top-1/3 sm:top-1/3 lg:w-3/4 absolute dark:border-neutral-700 flex-col gap-5 flex flex-col items-center justify-center transition-all ease-[cubic-bezier(0.705,0.010,0.000,0.915)] duration-500"
                v-for="question in props.quizJSON.questions" :id="String(question.id)" :key="question.id"
                :class="[{ 'active': currentQuestion === question.id }, { 'inactiveUP': currentQuestion < question.id }, { 'inactiveDOWN': currentQuestion > question.id }, { 'inactiveDOWN': isScore }]">
                <span class="p-0 text-center text-2xl font-bold">{{ question.id + 1 + ". " + question.question }}</span>
                <div class="answers relative flex flex-col w-fit mx-auto gap-2 h-fit items-start justify-center">
                    <URadio :color="'gray'" v-for="(answer, index) in question.answers" :key="index" @click="index"
                        v-model="questionsModelArray[question.id].answer" :value="question.question + '/' + index"
                        :ui="{ wrapper: 'relative flex items-center', label: 'text-sm py-1 font-medium text-gray-700 dark:text-gray-200' }"
                        class="p-1 w-fit hover:bg-gray-200 dark:hover:bg-zinc-500 rounded transition-all ease-[cubic-bezier(0.705,0.010,0.000,0.915)] duration-500">
                        <template #label>
                            <span class="text-lg cursor-pointer line">{{
                                answer }}</span>
                        </template>
                    </URadio>
                </div>
            </div>
            <div ref="score" :class="[{ 'inactiveUP': !isScore },{ 'inactiveUP': isScoreOut }, { 'active': isScore }]"
                class=" max-w-full bg-gray-200 dark:bg-zinc-900 rounded p-0 flex flex-col lg:top-1/4 max-h-full lg:w-3/4 opacity-1 absolute dark:border-neutral-700 flex-col gap-5 flex flex-col items-center justify-center transition-all ease-[cubic-bezier(0.705,0.010,0.000,0.915)] duration-500">

                <div class="flex gap-1 justify-center items-center border-b border-zinc-400">
                    <span class="flex items-center text-xl lg:text-3xl font-bold text-center pb-1.5">Результаты
                        тестирования</span>
                    <UIcon name="i-heroicons-chart-pie" class="flex items-center" />
                </div>
                <Doughnut class="chart max-h-72 w-full max-w-full" ref="chart" v-if="isScore" :data="chartData"
                    :options="options" />
                <UButton icon="i-heroicons-arrow-path" size="xl" block trailing color="black"
                    class="max-w-1/2 mt-5 mb-0" variant="solid" label="Перепройти тест"
                    :ui="{ rounded: 'rounded-none rounded-br rounded-bl' }" @click="resetScore" />
            </div>
            <div class="flex flex-wrap justify-center items-center w-full gap-2" :class="{ 'fadeOUT': isScore }">
                <UButton v-if="currentQuestion > 0" size="xl" icon="i-heroicons-arrow-left" color="black"
                    class="mt-5 dark:shadow-darkShadow max-w-1/2" variant="solid" label="Предыдущий вопрос"
                    @click="lastQuestion" />
                <UButton v-if="currentQuestion + 1 === quizJSON.questions.length" size="xl"
                    icon="i-heroicons-arrow-up-circle" trailing color="black"
                    class="mt-5 dark:shadow-darkShadow max-w-1/2" variant="solid" label="Подвести итоги"
                    @click="printScore" />
                <UButton v-else icon="i-heroicons-arrow-right" size="xl" trailing color="black"
                    class="mt-5 dark:shadow-darkShadow max-w-1/2" variant="solid" label="Следующий вопрос"
                    @click="nextQuestion" />
            </div>
        </div>
    </div>
</template>


<style scoped>
.active {
    opacity: 1;
    transform: translateY(0) scale(1);
}

.fadeOUT {
    opacity: 0;
}

.inactiveUP {
    opacity: 0;
    pointer-events: none;
    transform: translateY(300px) scale(1.25);
    @apply blur-sm;
}

.inactiveDOWN {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-300px) scale(0.75);
    @apply blur-sm;
}

.chart p {
    @apply dark:text-white;
}
</style>