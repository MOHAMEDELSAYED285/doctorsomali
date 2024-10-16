"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Send, RefreshCcw, Download } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import jsPDF from 'jspdf'
import {
  UserIcon,
  ActivityIcon,
  ClipboardIcon,
  AlertTriangleIcon,
  HelpCircleIcon,
  EyeIcon,
  BarChartIcon,
  CheckCircle,
  Circle,
} from "lucide-react"

export default function SymptomInput() {
  // State variables
  const [step, setStep] = useState(0)
  const [symptoms, setSymptoms] = useState("")
  const [answers, setAnswers] = useState<{ choice: string; details?: string }[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [analysisReport, setAnalysisReport] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")

  // New state for patient information
  const [patientInfo, setPatientInfo] = useState({
    age: '',
    sex: '',
    height: '',
    weight: '',
    allergies: '',
    pastMedicalHistory: '',
    currentMedications: '',
  })

  // Number of initial steps before dynamic questions
  const initialSteps = 3

  // Define steps with labels and icons
  const stepsData = [
    { title: "General Info", icon: <UserIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
    { title: "Physical Info", icon: <ActivityIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
    { title: "Medical History", icon: <ClipboardIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
    { title: "Symptoms", icon: <AlertTriangleIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
    { title: "Questions", icon: <HelpCircleIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
    { title: "Review", icon: <EyeIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
    { title: "Analysis", icon: <BarChartIcon className="h-6 w-6 sm:h-7 sm:w-7" /> },
  ]

  // Handle answer submission for dynamic questions
  const handleAnswerSubmit = useCallback((answer: { choice: string; details?: string }) => {
    const newAnswers = [...answers]
    newAnswers[step - initialSteps - 1] = answer
    setAnswers(newAnswers)
    if (step < initialSteps + questions.length) {
      setStep(step + 1)
    } else {
      setStep(initialSteps + questions.length + 1)
    }
  }, [answers, step, questions.length])

  // Handle key press for 'Enter' key navigation
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && step > initialSteps && step <= initialSteps + questions.length) {
        if (answers[step - initialSteps - 1] && answers[step - initialSteps - 1].choice.trim() !== '') {
          handleAnswerSubmit(answers[step - initialSteps - 1])
        }
      }
    }

    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [step, questions.length, answers, handleAnswerSubmit])

  // Fetch dynamic questions based on symptoms
  const handleSymptomSubmit = async () => {
    setIsGeneratingQuestions(true)
    setError("")
    const prompt = `Based on the following symptoms, generate 4 relevant follow-up questions in both English and Somali to gather more information. For yes/no questions, indicate [YES/NO] at the end:

Symptoms: ${symptoms}

Generate the questions in the following format:
1. English question (Somali translation) [YES/NO if applicable]
2. English question (Somali translation) [YES/NO if applicable]
3. English question (Somali translation) [YES/NO if applicable]
4. English question (Somali translation) [YES/NO if applicable]`

    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate questions')
      }

      const data = await response.json()
      const generatedQuestions = data.result.split('\n').filter((q: string) => q.trim() !== '')
      setQuestions(generatedQuestions)
      setAnswers(new Array(generatedQuestions.length).fill({ choice: '' }))
      setStep(initialSteps + 1)
    } catch (error) {
      console.error('Error generating questions:', error)
      setError("There was an error generating questions. Please try again.")
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  // Submit all collected data for analysis
  const handleSubmit = async () => {
    setIsAnalyzing(true)
    setError("")
    try {
      const response = await fetch('/api/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms, questions, answers, patientInfo }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze symptoms')
      }

      const data = await response.json()
      setAnalysisReport(data.result)
      setStep(initialSteps + questions.length + 2)
    } catch (error) {
      console.error('Error analyzing symptoms:', error)
      setError("There was an error analyzing your symptoms. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Reset the form for a new patient
  const handleNewPatient = () => {
    setStep(0)
    setSymptoms("")
    setAnswers([])
    setQuestions([])
    setAnalysisReport("")
    setPatientInfo({
      age: '',
      sex: '',
      height: '',
      weight: '',
      allergies: '',
      pastMedicalHistory: '',
      currentMedications: '',
    })
  }

  // Download the analysis report as a PDF
  const handleDownloadReport = () => {
    const doc = new jsPDF()
    let yOffset = 10

    // Add title
    doc.setFontSize(20)
    doc.text('Symptom Analysis Report', 105, yOffset, { align: 'center' })
    yOffset += 20

    // Add patient info
    doc.setFontSize(16)
    doc.text('Patient Information:', 10, yOffset)
    yOffset += 10
    doc.setFontSize(12)
    const patientDetails = `
Age: ${patientInfo.age}
Sex: ${patientInfo.sex}
Height: ${patientInfo.height}
Weight: ${patientInfo.weight}
Allergies: ${patientInfo.allergies}
Past Medical History: ${patientInfo.pastMedicalHistory}
Current Medications: ${patientInfo.currentMedications}
    `
    const splitPatientDetails = doc.splitTextToSize(patientDetails, 180)
    doc.text(splitPatientDetails, 10, yOffset)
    yOffset += splitPatientDetails.length * 7 + 10

    // Add symptoms
    doc.setFontSize(16)
    doc.text('Symptoms:', 10, yOffset)
    yOffset += 10
    doc.setFontSize(12)
    const splitSymptoms = doc.splitTextToSize(symptoms, 180)
    doc.text(splitSymptoms, 10, yOffset)
    yOffset += splitSymptoms.length * 7 + 10

    // Add questions and answers
    doc.setFontSize(16)
    doc.text('Medical History Questions:', 10, yOffset)
    yOffset += 10
    doc.setFontSize(12)
    questions.forEach((question, index) => {
      const splitQuestion = doc.splitTextToSize(question.replace('[YES/NO]', ''), 180)
      doc.text(splitQuestion, 10, yOffset)
      yOffset += splitQuestion.length * 7 + 5
      doc.text(`Answer: ${answers[index].choice}`, 10, yOffset)
      if (answers[index].details) {
        yOffset += 7
        doc.text(`Additional details: ${answers[index].details}`, 10, yOffset)
      }
      yOffset += 10
    })

    // Add analysis
    yOffset += 10
    doc.setFontSize(16)
    doc.text('Analysis:', 10, yOffset)
    yOffset += 10
    doc.setFontSize(12)

    // Parse and format the analysis report for PDF
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(analysisReport, "text/xml")
    const conditions = xmlDoc.getElementsByTagName("condition")

    Array.from(conditions).forEach((condition, index) => {
      const name = condition.getElementsByTagName("name")[0]?.textContent || ''
      const likelihood = condition.getElementsByTagName("likelihood")[0]?.textContent || ''
      const description = condition.getElementsByTagName("description")[0]?.textContent || ''
      const treatments = condition.getElementsByTagName("treatment")
      const medicines = condition.getElementsByTagName("medicine")

      doc.setFontSize(14)
      doc.text(`${index + 1}. ${name} (${likelihood})`, 10, yOffset)
      yOffset += 7

      doc.setFontSize(12)
      const splitDescription = doc.splitTextToSize(description, 180)
      doc.text(splitDescription, 10, yOffset)
      yOffset += splitDescription.length * 7 + 5

      doc.text('Treatments:', 10, yOffset)
      yOffset += 7
      Array.from(treatments).forEach((treatment) => {
        doc.text(`- ${treatment.textContent}`, 15, yOffset)
        yOffset += 7
      })

      doc.text('Medicines:', 10, yOffset)
      yOffset += 7
      Array.from(medicines).forEach((medicine) => {
        const medName = medicine.getElementsByTagName("name")[0]?.textContent || ''
        const dosage = medicine.getElementsByTagName("dosage")[0]?.textContent || ''
        doc.text(`- ${medName}`, 15, yOffset)
        yOffset += 7
        doc.text(`  Dosage: ${dosage}`, 20, yOffset)
        yOffset += 7

        const alternatives = medicine.getElementsByTagName("alternative")
        if (alternatives.length > 0) {
          doc.text('  Alternatives:', 20, yOffset)
          yOffset += 7
          Array.from(alternatives).forEach((alt) => {
            doc.text(`  - ${alt.textContent}`, 25, yOffset)
            yOffset += 7
          })
        }
      })

      yOffset += 10
    })

    // Save the PDF
    doc.save('symptom_analysis_report.pdf')
  }

  // Total number of steps including dynamic questions and analysis

  // Function to format the analysis report
  const formatReport = (report: string) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(report, "text/xml")
    const conditions = xmlDoc.getElementsByTagName("condition")

    return Array.from(conditions).map((condition, index) => {
      const name = condition.getElementsByTagName("name")[0]?.textContent || ''
      const likelihood = condition.getElementsByTagName("likelihood")[0]?.textContent || ''
      const description = condition.getElementsByTagName("description")[0]?.textContent || ''
      const treatments = condition.getElementsByTagName("treatment")
      const medicines = condition.getElementsByTagName("medicine")

      return (
        <div key={index} className="mb-6 p-6 bg-white rounded-lg shadow-md border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-blue-800">{name}</h3>
            <span className="text-sm font-semibold text-gray-600">{likelihood}</span>
          </div>
          <p className="mb-4 text-gray-700">{description}</p>
          <div className="mb-4">
            <h4 className="text-xl font-semibold text-blue-700 mb-2">Treatments:</h4>
            <ul className="list-disc list-inside text-gray-700">
              {Array.from(treatments).map((treatment, i) => (
                <li key={i}>{treatment.textContent}</li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xl font-semibold text-blue-700 mb-2">Medicines:</h4>
            {Array.from(medicines).map((medicine, i) => {
              const medName = medicine.getElementsByTagName("name")[0]?.textContent || ''
              const dosage = medicine.getElementsByTagName("dosage")[0]?.textContent || ''
              const alternatives = medicine.getElementsByTagName("alternative")
              return (
                <div key={i} className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-lg font-semibold text-blue-800">{medName}</p>
                  <p className="text-gray-700 mb-2">Dosage: {dosage}</p>
                  {alternatives.length > 0 && (
                    <div>
                      <p className="text-gray-700 font-medium">Alternatives:</p>
                      <ul className="list-disc list-inside text-gray-700">
                        {Array.from(alternatives).map((alt, j) => (
                          <li key={j}>{alt.textContent}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )
    })
  }

  // Check if a question is a yes/no question
  const isYesNoQuestion = (question: string) => question.toLowerCase().includes('[yes/no]')

  // Render the component
  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
      {/* Enhanced Progress Indicator */}
      <CardHeader className="bg-blue-600 text-white p-6 sm:p-8">
        <div className="flex overflow-x-auto space-x-4 pb-2">
          {stepsData.map((stepData, index) => (
            <div key={index} className="flex flex-col items-center flex-shrink-0">
              {index < step ? (
                <CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
              ) : index === step ? (
                <div className="animate-bounce">
                  {stepData.icon}
                </div>
              ) : (
                <Circle className="h-6 w-6 sm:h-7 sm:w-7 text-blue-300" />
              )}
              <span className={`mt-2 text-xs sm:text-sm ${index === step ? 'font-bold' : 'font-medium'}`}>
                {stepData.title}
              </span>
            </div>
          ))}
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-6 sm:p-8 xs:p-4">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="space-y-6"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>
      </CardContent>

      {/* Footer with navigation buttons */}
      <CardFooter className="flex flex-col sm:flex-row justify-between p-6 sm:p-8 bg-blue-50 border-t border-blue-200">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex items-center mb-4 sm:mb-0 text-blue-600 hover:bg-blue-100 border-2 border-blue-300 px-4 sm:px-6 py-2 sm:py-3 rounded-full transition-all duration-300"
          >
            <ArrowLeft className="mr-2 h-5 w-5" /> Back
          </Button>
        )}
        {renderNextButton()}
      </CardFooter>
    </Card>
  )

  // Function to render the content for the current step
  function renderStepContent() {
    if (step === 0) {
      // Step 0: General Information
      return (
        <div className="space-y-4">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">General Information</h3>
          <div className="space-y-4">
            {/* Age Input with Floating Label */}
            <div className="relative">
              <Input
                type="number"
                id="age"
                name="age"
                value={patientInfo.age}
                onChange={(e) => setPatientInfo({ ...patientInfo, age: e.target.value })}
                className="block w-full px-4 pt-6 pb-1 text-black text-lg sm:text-xl border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                placeholder=" "
                required
              />
              <label
                htmlFor="age"
                className={`absolute left-4 top-4 transition-all duration-300 ${
                  patientInfo.age ? 'text-xs sm:text-sm text-blue-600 -translate-y-3' : 'text-base sm:text-lg text-gray-500'
                }`}
              >
                Age
              </label>
            </div>
            {/* Sex Selection */}
            <div className="flex flex-col sm:flex-row sm:space-x-4 space-y-4 sm:space-y-0">
              {/* Male Option */}
              <div className="flex items-center">
                <input
                  type="radio"
                  id="male"
                  name="sex"
                  value="Male"
                  checked={patientInfo.sex === 'Male'}
                  onChange={(e) => setPatientInfo({ ...patientInfo, sex: e.target.value })}
                  className="hidden peer"
                  required
                />
                <label
                  htmlFor="male"
                  className="flex items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 peer-checked:border-blue-600 peer-checked:bg-blue-50 transition-all duration-300"
                >
                  <span className="text-lg sm:text-xl font-medium text-gray-700">Male</span>
                </label>
              </div>
              {/* Female Option */}
              <div className="flex items-center">
                <input
                  type="radio"
                  id="female"
                  name="sex"
                  value="Female"
                  checked={patientInfo.sex === 'Female'}
                  onChange={(e) => setPatientInfo({ ...patientInfo, sex: e.target.value })}
                  className="hidden peer"
                />
                <label
                  htmlFor="female"
                  className="flex items-center justify-center p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 peer-checked:border-blue-600 peer-checked:bg-blue-50 transition-all duration-300"
                >
                  <span className="text-lg sm:text-xl font-medium text-gray-700">Female</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      )
    } else if (step === 1) {
      // Step 1: Physical Information
      return (
        <div className="space-y-4">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">Physical Information</h3>
          <div className="space-y-4">
            {/* Height Input */}
            <div className="relative">
              <Input
                type="number"
                id="height"
                name="height"
                value={patientInfo.height}
                onChange={(e) => setPatientInfo({ ...patientInfo, height: e.target.value })}
                className="block w-full px-4 pt-6 pb-1 text-black text-lg sm:text-xl border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                placeholder=" "
                required
              />
              <label
                htmlFor="height"
                className={`absolute left-4 top-4 transition-all duration-300 ${
                  patientInfo.height ? 'text-xs sm:text-sm text-blue-600 -translate-y-3' : 'text-base sm:text-lg text-gray-500'
                }`}
              >
                Height (cm)
              </label>
            </div>
            {/* Weight Input */}
            <div className="relative">
              <Input
                type="number"
                id="weight"
                name="weight"
                value={patientInfo.weight}
                onChange={(e) => setPatientInfo({ ...patientInfo, weight: e.target.value })}
                className="block w-full px-4 pt-6 pb-1 text-black text-lg sm:text-xl border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                placeholder=" "
                required
              />
              <label
                htmlFor="weight"
                className={`absolute left-4 top-4 transition-all duration-300 ${
                  patientInfo.weight ? 'text-xs sm:text-sm text-blue-600 -translate-y-3' : 'text-base sm:text-lg text-gray-500'
                }`}
              >
                Weight (kg)
              </label>
            </div>
          </div>
        </div>
      )
    } else if (step === 2) {
      // Step 2: Medical History
      return (
        <div className="space-y-4">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">Medical History</h3>
          <div className="space-y-4">
            {/* Allergies Input */}
            <div className="relative">
              <Textarea
                name="allergies"
                id="allergies"
                value={patientInfo.allergies}
                onChange={(e) => setPatientInfo({ ...patientInfo, allergies: e.target.value })}
                className="block w-full px-4 pt-6 pb-1 text-black text-lg sm:text-xl border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                placeholder=" "
                required
              />
              <label
                htmlFor="allergies"
                className={`absolute left-4 top-4 transition-all duration-300 ${
                  patientInfo.allergies ? 'text-xs sm:text-sm text-blue-600 -translate-y-3' : 'text-base sm:text-lg text-gray-500'
                }`}
              >
                Allergies
              </label>
            </div>
            {/* Past Medical History Input */}
            <div className="relative">
              <Textarea
                name="pastMedicalHistory"
                id="pastMedicalHistory"
                value={patientInfo.pastMedicalHistory}
                onChange={(e) => setPatientInfo({ ...patientInfo, pastMedicalHistory: e.target.value })}
                className="block w-full px-4 pt-6 pb-1 text-black text-lg sm:text-xl border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                placeholder=" "
                required
              />
              <label
                htmlFor="pastMedicalHistory"
                className={`absolute left-4 top-4 transition-all duration-300 ${
                  patientInfo.pastMedicalHistory ? 'text-xs sm:text-sm text-blue-600 -translate-y-3' : 'text-base sm:text-lg text-gray-500'
                }`}
              >
                Past Medical History
              </label>
            </div>
            {/* Current Medications Input */}
            <div className="relative">
              <Textarea
                name="currentMedications"
                id="currentMedications"
                value={patientInfo.currentMedications}
                onChange={(e) => setPatientInfo({ ...patientInfo, currentMedications: e.target.value })}
                className="block w-full px-4 pt-6 pb-1 text-black text-lg sm:text-xl border-2 border-gray-200 rounded-md focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300"
                placeholder=" "
                required
              />
              <label
                htmlFor="currentMedications"
                className={`absolute left-4 top-4 transition-all duration-300 ${
                  patientInfo.currentMedications ? 'text-xs sm:text-sm text-blue-600 -translate-y-3' : 'text-base sm:text-lg text-gray-500'
                }`}
              >
                Current Medications
              </label>
            </div>
          </div>
        </div>
      )
    } else if (step === 3) {
      // Step 3: Symptom Input
      return (
        <div className="space-y-4">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">Describe Your Symptoms</h3>
          <Textarea
            placeholder="Please describe your symptoms in detail..."
            value={symptoms}
            onChange={(e) => setSymptoms(e.target.value)}
            className="min-h-[200px] w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 text-black text-lg sm:text-xl"
          />
        </div>
      )
    } else if (step > initialSteps && step <= initialSteps + questions.length) {
      // Steps for Additional Questions
      return (
        <div className="space-y-6">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">Additional Question</h3>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200">
            <p className="text-xl sm:text-2xl text-black mb-4 font-medium">
              {questions[step - initialSteps - 1].replace('[YES/NO]', '')}
            </p>
            {isYesNoQuestion(questions[step - initialSteps - 1]) ? (
              <div className="space-y-4">
                {/* Yes/No Options */}
                <RadioGroup
                  value={answers[step - initialSteps - 1]?.choice || ''}
                  onValueChange={(value) => {
                    const newAnswers = [...answers]
                    newAnswers[step - initialSteps - 1] = { ...newAnswers[step - initialSteps - 1], choice: value }
                    setAnswers(newAnswers)
                  }}
                  className="space-y-4"
                >
                  {['yes', 'no'].map((value) => (
                    <div key={value} className="flex items-center">
                      <RadioGroupItem
                        value={value}
                        id={value}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={value}
                        className={`flex flex-1 items-center justify-center rounded-lg border-2 border-gray-200 p-4 hover:bg-gray-100 cursor-pointer transition-all duration-300 ${
                          answers[step - initialSteps - 1]?.choice === value ? 'bg-blue-50 border-blue-500' : ''
                        }`}
                      >
                        <span className={`text-lg sm:text-xl font-medium ${answers[step - initialSteps - 1]?.choice === value ? 'text-black' : 'text-gray-700'}`}>
                          {value === 'yes' ? 'Yes' : 'No'}
                        </span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                {/* Additional Details if 'Yes' */}
                {answers[step - initialSteps - 1]?.choice === 'yes' && (
                  <Textarea
                    placeholder="Please provide more details..."
                    value={answers[step - initialSteps - 1]?.details || ''}
                    onChange={(e) => {
                      const newAnswers = [...answers]
                      newAnswers[step - initialSteps - 1] = { ...newAnswers[step - initialSteps - 1], details: e.target.value }
                      setAnswers(newAnswers)
                    }}
                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 text-black text-lg sm:text-xl"
                  />
                )}
              </div>
            ) : (
              // Open-ended Question Input
              <Input
                placeholder="Your answer..."
                value={answers[step - initialSteps - 1]?.choice || ''}
                onChange={(e) => {
                  const newAnswers = [...answers]
                  newAnswers[step - initialSteps - 1] = { choice: e.target.value }
                  setAnswers(newAnswers)
                }}
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 text-black text-lg sm:text-xl"
              />
            )}
          </div>
        </div>
      )
    } else if (step === initialSteps + questions.length + 1) {
      // Summary Step
      return (
        <div className="space-y-6">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">Review</h3>
          {/* Patient Information */}
          <div className="bg-blue-50 p-4 sm:p-6 rounded-lg shadow-md border border-blue-200">
            <h4 className="font-semibold mb-2 text-blue-700 text-lg sm:text-xl">Patient Information:</h4>
            <p className="text-black text-base sm:text-lg">Age: {patientInfo.age}</p>
            <p className="text-black text-base sm:text-lg">Sex: {patientInfo.sex}</p>
            <p className="text-black text-base sm:text-lg">Height: {patientInfo.height} cm</p>
            <p className="text-black text-base sm:text-lg">Weight: {patientInfo.weight} kg</p>
            <p className="text-black text-base sm:text-lg">Allergies: {patientInfo.allergies}</p>
            <p className="text-black text-base sm:text-lg">Past Medical History: {patientInfo.pastMedicalHistory}</p>
            <p className="text-black text-base sm:text-lg">Current Medications: {patientInfo.currentMedications}</p>
          </div>
          {/* Symptoms */}
          <div className="bg-blue-50 p-4 sm:p-6 rounded-lg shadow-md border border-blue-200">
            <h4 className="font-semibold mb-2 text-blue-700 text-lg sm:text-xl">Your Symptoms:</h4>
            <p className="text-black text-base sm:text-lg">{symptoms}</p>
          </div>
          {/* Questions and Answers */}
          {questions.map((question, index) => (
            <div key={index} className="bg-blue-50 p-4 sm:p-6 rounded-lg shadow-md border border-blue-200">
              <h4 className="font-semibold mb-2 text-blue-700 text-lg sm:text-xl">{question.replace('[YES/NO]', '')}</h4>
              <p className="text-black text-base sm:text-lg">
                {answers[index]?.choice}
                {answers[index]?.details && (
                  <>
                    <br />
                    <span className="text-blue-600">Additional details: </span>
                    {answers[index]?.details}
                  </>
                )}
              </p>
            </div>
          ))}
        </div>
      )
    } else if (step === initialSteps + questions.length + 2) {
      // Analysis Step
      return (
        <div className="space-y-6">
          <h3 className="text-2xl sm:text-3xl font-semibold text-blue-800">Symptom Analysis</h3>
          {isAnalyzing ? (
            <div className="flex justify-center items-center h-60">
              <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-500"></div>
            </div>
          ) : (
            <>
              {formatReport(analysisReport)}
              <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mt-6">
                <Button
                  onClick={handleNewPatient}
                  className="bg-green-500 text-white hover:bg-green-600 transition-all duration-300 px-6 py-2 sm:px-8 sm:py-3 rounded-full text-lg font-semibold flex items-center justify-center"
                >
                  <RefreshCcw className="mr-2 h-5 w-5" /> New Patient
                </Button>
                <Button
                  onClick={handleDownloadReport}
                  className="bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 px-6 py-2 sm:px-8 sm:py-3 rounded-full text-lg font-semibold flex items-center justify-center"
                >
                  <Download className="mr-2 h-5 w-5" /> Download Report
                </Button>
              </div>
            </>
          )}
        </div>
      )
    }
  }

  // Function to render the Next or Submit button based on the current step
  function renderNextButton() {
    if (step >= 0 && step < initialSteps) {
      return (
        <Button
          onClick={() => setStep(step + 1)}
          disabled={
            (step === 0 && (!patientInfo.age.trim() || !patientInfo.sex.trim())) ||
            (step === 1 && (!patientInfo.height.trim() || !patientInfo.weight.trim())) ||
            (step === 2 && (!patientInfo.allergies.trim() || !patientInfo.pastMedicalHistory.trim() || !patientInfo.currentMedications.trim()))
          }
          className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transform transition duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg px-6 sm:px-8 py-3 rounded-full text-lg font-semibold"
        >
          Next <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      )
    } else if (step === initialSteps) {
      return (
        <Button
          onClick={handleSymptomSubmit}
          disabled={!symptoms.trim() || isGeneratingQuestions}
          className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transform transition duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg px-6 sm:px-8 py-3 rounded-full text-lg font-semibold"
        >
          {isGeneratingQuestions ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Loading...
            </div>
          ) : (
            <>
              Next <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      )
    } else if (step > initialSteps && step <= initialSteps + questions.length) {
      return (
        <Button
          onClick={() => handleAnswerSubmit(answers[step - initialSteps - 1] || { choice: '' })}
          disabled={!answers[step - initialSteps - 1] || !answers[step - initialSteps - 1].choice || answers[step - initialSteps - 1].choice.trim() === ''}
          className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transform transition duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg px-6 sm:px-8 py-3 rounded-full text-lg font-semibold"
        >
          {step === initialSteps + questions.length ? "Review" : "Next"} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      )
    } else if (step === initialSteps + questions.length + 1) {
      return (
        <Button
          onClick={handleSubmit}
          disabled={isAnalyzing}
          className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transform transition duration-300 ease-in-out hover:-translate-y-1 hover:shadow-lg px-6 sm:px-8 py-3 rounded-full text-lg font-semibold"
        >
          {isAnalyzing ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
              Loading...
            </div>
          ) : (
            <>
              Analyze <Send className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
      )
    }
  }
}
