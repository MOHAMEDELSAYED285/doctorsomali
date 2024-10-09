"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ArrowLeft, ArrowRight, Send, CheckCircle2, RefreshCcw, Download } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Alert, AlertDescription } from "@/components/ui/alert"
import jsPDF from 'jspdf'
export default function SymptomInput() {
  const [step, setStep] = useState(0)
  const [symptoms, setSymptoms] = useState("")
  const [answers, setAnswers] = useState<{ choice: string; details?: string }[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [analysisReport, setAnalysisReport] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")

  const handleAnswerSubmit = useCallback((answer: { choice: string; details?: string }) => {
    const newAnswers = [...answers]
    newAnswers[step - 1] = answer
    setAnswers(newAnswers)
    if (step < questions.length) {
      setStep(step + 1)
    } else {
      setStep(questions.length + 1)
    }
  }, [answers, step, questions.length])

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && step > 0 && step <= questions.length) {
        if (answers[step - 1] && answers[step - 1].choice.trim() !== '') {
          handleAnswerSubmit(answers[step - 1])
        }
      }
    }

    window.addEventListener('keypress', handleKeyPress)

    return () => {
      window.removeEventListener('keypress', handleKeyPress)
    }
  }, [step, questions.length, answers, handleAnswerSubmit])

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
      setStep(1)
    } catch (error) {
      console.error('Error generating questions:', error)
      setError("There was an error generating questions. Please try again.")
    } finally {
      setIsGeneratingQuestions(false)
    }
  }

  const handleSubmit = async () => {
    setIsAnalyzing(true)
    setError("")
    try {
      const response = await fetch('/api/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms, questions, answers }),
      })

      if (!response.ok) {
        throw new Error('Failed to analyze symptoms')
      }

      const data = await response.json()
      setAnalysisReport(data.result)
      setStep(questions.length + 2)
    } catch (error) {
      console.error('Error analyzing symptoms:', error)
      setError("There was an error analyzing your symptoms. Please try again.")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleNewPatient = () => {
    setStep(0)
    setSymptoms("")
    setAnswers([])
    setQuestions([])
    setAnalysisReport("")
  }

  const handleDownloadReport = () => {
    const doc = new jsPDF()
    let yOffset = 10

    // Add title
    doc.setFontSize(20)
    doc.text('Symptom Analysis Report', 105, yOffset, { align: 'center' })
    yOffset += 20

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
    doc.text('Medical History:', 10, yOffset)
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
    const splitAnalysis = doc.splitTextToSize(analysisReport, 180)
    doc.text(splitAnalysis, 10, yOffset)

    // Save the PDF
    doc.save('symptom_analysis_report.pdf')
  }

  const progressPercentage = ((step) / (questions.length + 3)) * 100

  const formatReport = (report: string) => {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(report, "text/xml")
    const conditions = xmlDoc.getElementsByTagName("condition")

    return Array.from(conditions).map((condition, index) => (
      <div key={index} className="mb-6 p-4 bg-white rounded-lg shadow">
        <h3 className="text-xl font-bold mb-2">{condition.getElementsByTagName("name")[0].textContent}</h3>
        <p className="mb-2">{condition.getElementsByTagName("description")[0].textContent}</p>
        <div className="mb-2">
          <h4 className="font-semibold">Daaweynta (Treatments):</h4>
          <ul className="list-disc list-inside">
            {Array.from(condition.getElementsByTagName("treatment")).map((treatment, i) => (
              <li key={i}>{treatment.textContent}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-semibold">Daawooyinka (Medicines):</h4>
          <ul className="list-disc list-inside">
            {Array.from(condition.getElementsByTagName("medicine")).map((medicine, i) => (
              <li key={i}>{medicine.textContent}</li>
            ))}
          </ul>
        </div>
      </div>
    ))
  }

  const isYesNoQuestion = (question: string) => question.toLowerCase().includes('[yes/no]')
  
  const stepTitles = [
    "Macluumaadka Guud (General Information)",
    "Taariikhda Caafimaad (Medical History)",
    "Dib u eegis (Summary)",
    "Falanqaynta Calaamadaha (Symptom Analysis)"
  ]

  return (
    <Card className="w-full max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">
      <div className="h-2 bg-blue-500 transition-all duration-500 ease-in-out" style={{ width: `${progressPercentage}%` }}></div>
      <CardHeader className="bg-blue-600 text-white p-8">
        <CardTitle className="text-3xl font-bold text-center mb-2">
          {stepTitles[Math.min(step, stepTitles.length - 1)]}
        </CardTitle>
        <div className="flex justify-center items-center space-x-2">
          {[...Array(questions.length + 3)].map((_, index) => (
            <div
              key={index}
              className={`w-3 h-3 rounded-full ${index <= step ? 'bg-white' : 'bg-blue-300'} transition-all duration-300`}
            ></div>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-8">
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
            {step === 0 && (
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold text-blue-800">Sharaxaad ka bixi Calaamadahaaga (Describe Your Symptoms)</h3>
                <Textarea
                  placeholder="Fadlan, si faahfaahsan u sharax calaamadahaaga... (Please describe your symptoms in detail...)"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="min-h-[200px] w-full p-4 border-2 border-blue-200 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 text-black text-lg"
                />
              </div>
            )}
            {step > 0 && step <= questions.length && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-blue-800">Su&apos;aal Dheeraad ah (Additional Question)</h3>
                <div className="bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200">
                  <p className="text-xl text-black mb-4">{questions[step - 1].replace('[YES/NO]', '')}</p>
                  {isYesNoQuestion(questions[step - 1]) ? (
                    <div className="space-y-4">
                      <RadioGroup
                        value={answers[step - 1]?.choice || ''}
                        onValueChange={(value) => {
                          const newAnswers = [...answers]
                          newAnswers[step - 1] = { ...newAnswers[step - 1], choice: value }
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
                              className={`flex flex-1 items-center justify-between rounded-lg border-2 border-blue-200 p-4 hover:bg-blue-100 cursor-pointer transition-all duration-300 ${
                                answers[step - 1]?.choice === value ? 'bg-blue-200 border-blue-500' : ''
                              }`}
                            >
                              <span className={`text-lg font-medium ${answers[step - 1]?.choice === value ? 'text-black' : 'text-blue-600'}`}>
                                {value === 'yes' ? 'Haa (Yes)' : 'Maya (No)'}
                              </span>
                              <CheckCircle2 className={`h-6 w-6 ${answers[step - 1]?.choice === value ? 'text-black' : 'text-blue-600 opacity-0'}`} />
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                      {answers[step - 1]?.choice === 'yes' && (
                        <Textarea
                          placeholder="Fadlan, faahfaahin dheeraad ah ku bixi... (Please provide more details...)"
                          value={answers[step - 1]?.details || ''}
                          onChange={(e) => {
                            const newAnswers = [...answers]
                            newAnswers[step - 1] = { ...newAnswers[step - 1], details: e.target.value }
                            setAnswers(newAnswers)
                          }}
                          className="w-full p-4 border-2 border-blue-200 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 text-black text-lg"
                        />
                      )}
                    </div>
                  ) : (
                    <Input
                      placeholder="Jawaabtaada... (Your answer...)"
                      value={answers[step - 1]?.choice || ''}
                      onChange={(e) => {
                        const newAnswers = [...answers]
                        newAnswers[step - 1] = { choice: e.target.value }
                        setAnswers(newAnswers)
                      }}
                      className="w-full p-4 border-2 border-blue-200 rounded-lg focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-300 text-black text-lg"
                    />
                  )}
                </div>
              </div>
            )}
            {step === questions.length + 1 && (
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-blue-800">Dib u eegis (Summary)</h3>
                <div className="bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200">
                  <h4 className="font-semibold mb-2 text-blue-700">Calaamadahaaga (Your Symptoms):</h4>
                  <p className="text-black text-lg">{symptoms}</p>
                </div>
                {questions.map((question, index) => (
                  <div key={index} className="bg-blue-50 p-6 rounded-lg shadow-md border border-blue-200">
                    <h4 className="font-semibold mb-2 text-blue-700">{question.replace('[YES/NO]', '')}</h4>
                    <p className="text-black text-lg">
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
        )}
        {step === questions.length + 2 && (
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-blue-800">Falanqaynta Calaamadaha (Symptom Analysis)</h3>
            {isAnalyzing ? (
              <div className="flex justify-center items-center h-60">
                <div className="animate-spin rounded-full h-20 w-20 border-b-4 border-blue-500"></div>
              </div>
            ) : (
              <>
                {formatReport(analysisReport)}
                <div className="flex justify-center space-x-4 mt-6">
                  <Button
                    onClick={handleNewPatient}
                    className="bg-green-500 text-white hover:bg-green-600 transition-all duration-300 px-6 py-2 rounded-full text-lg font-semibold flex items-center"
                  >
                    <RefreshCcw className="mr-2 h-5 w-5" /> New Patient
                  </Button>
                  <Button
                    onClick={handleDownloadReport}
                    className="bg-blue-500 text-white hover:bg-blue-600 transition-all duration-300 px-6 py-2 rounded-full text-lg font-semibold flex items-center"
                  >
                    <Download className="mr-2 h-5 w-5" /> Download Report
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  </CardContent>
  <CardFooter className="flex justify-between p-8 bg-blue-50 border-t border-blue-200">
    {step > 0 && step <= questions.length + 1 && (
      <Button
        variant="outline"
        onClick={() => setStep(step - 1)}
        className="flex items-center text-blue-600 hover:bg-blue-100 border-2 border-blue-300 px-6 py-3 rounded-full transition-all duration-300"
      >
        <ArrowLeft className="mr-2 h-5 w-5" /> Dib (Back)
      </Button>
    )}
    {step === 0 && (
      <Button
        onClick={handleSymptomSubmit}
        disabled={!symptoms.trim() || isGeneratingQuestions}
        className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 px-8 py-3 rounded-full text-lg font-semibold"
      >
        {isGeneratingQuestions ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Loading...
          </div>
        ) : (
          <>
            Xiga (Next) <ArrowRight className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    )}
    {step > 0 && step <= questions.length && (
      <Button
        onClick={() => handleAnswerSubmit(answers[step - 1] || { choice: '' })}
        disabled={!answers[step - 1] || !answers[step - 1].choice || answers[step - 1].choice.trim() === ''}
        className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 px-8 py-3 rounded-full text-lg font-semibold"
      >
        {step === questions.length ? "Dib u eegis (Review)" : "Xiga (Next)"}{" "}
        <ArrowRight className="ml-2 h-5 w-5" />
      </Button>
    )}
    {step === questions.length + 1 && (
      <Button
        onClick={handleSubmit}
        disabled={isAnalyzing}
        className="ml-auto bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 px-8 py-3 rounded-full text-lg font-semibold"
      >
        {isAnalyzing ? (
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Loading...
          </div>
        ) : (
          <>
            Falanqaynta (Analyze) <Send className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>
    )}
  </CardFooter>
</Card>
  )
}