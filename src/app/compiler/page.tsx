/* eslint-disable @typescript-eslint/explicit-function-return-type */
"use client"

import React, { FC, useEffect, useRef, useState } from "react"

import {
	Button,
	Card,
	CardBody,
	CardHeader,
	Chip,
	Input,
	ScrollShadow,
} from "@heroui/react"

type CompilerMessage = {
	output?: string
	error?: string
	closed?: boolean
}

const isValidScriptName = (name: string) => /^[\w-]+\.py$/.test(name)

const Compiler: FC = () => {
	// WebSocket URL: can override via NEXT_PUBLIC_COMPILER_WS
	const wsUrl =
		process.env.NEXT_PUBLIC_COMPILER_WS || "ws://localhost:3002/ws/compiler"

	const [scriptName, setScriptName] = useState<string>("")
	const [userInput, setUserInput] = useState<string>("")
	const [output, setOutput] = useState<string>("")
	const [ws, setWs] = useState<WebSocket | null>(null)
	const [running, setRunning] = useState<boolean>(false)
	const [errorMsg, setErrorMsg] = useState<string | null>(null)
	const consoleRef = useRef<HTMLPreElement>(null)

	// Initialize WebSocket connection
	useEffect(() => {
		const websocket = new WebSocket(wsUrl)

		websocket.onopen = () => {
			console.log("WebSocket connected to compiler")
			setErrorMsg(null)
		}

		websocket.onmessage = (event: MessageEvent) => {
			let data: CompilerMessage

			try {
				data = JSON.parse(event.data)
			} catch {
				return setOutput((prev) => prev + `\n[Invalid JSON received]\n`)
			}

			if (data.output) setOutput((prev) => prev + data.output)

			if (data.error) setOutput((prev) => prev + data.error)

			if (data.closed) setRunning(false)
		}

		websocket.onerror = (evt) => {
			console.error("WebSocket error", evt)
			setErrorMsg("Connection error, please check server or URL.")
		}

		websocket.onclose = (evt) => {
			console.warn("WebSocket closed", evt.reason)
			setRunning(false)
			setWs(null)
		}

		setWs(websocket)

		return () => websocket.close()
	}, [wsUrl])

	// Auto-scroll console
	useEffect(() => {
		if (consoleRef.current) {
			consoleRef.current.scrollTop = consoleRef.current.scrollHeight
		}
	}, [output])

	const startScript = (): void => {
		console.log("startScript invoked", {
			scriptName,
			ws,
			running,
			errorMsg,
		})

		if (!isValidScriptName(scriptName)) {
			setErrorMsg("Invalid filename format.")

			return
		}

		if (!ws) {
			setErrorMsg("WebSocket not connected.")

			return
		}

		if (running) {
			setErrorMsg("Script is already running.")

			return
		}

		setErrorMsg(null)
		setOutput("")
		setRunning(true)
		ws.send(JSON.stringify({ type: "START", script: scriptName }))
	}

	const sendInput = (): void => {
		if (ws && userInput) {
			ws.send(JSON.stringify({ type: "INPUT", input: userInput }))
			setUserInput("")
		}
	}

	const terminateScript = (): void => {
		if (ws && running) {
			ws.send(JSON.stringify({ type: "TERMINATE" }))
			setRunning(false)
			setOutput((prev) => prev + "\n[Script terminated by user]\n")
		}
	}

	return (
		<Card>
			<CardHeader>Python Compiler</CardHeader>
			<CardBody>
				<Input
					className="mb-2"
					disabled={running}
					onChange={(e) => setScriptName(e.target.value.trim())}
					placeholder="Enter filename (e.g., test.py)"
					value={scriptName}
				/>

				<Button
					className="mb-2"
					disabled={running}
					onClick={startScript}
				>
					{running ? "Running..." : "Start"}
				</Button>

				{errorMsg && (
					<Chip className="mb-2" color="danger">
						{errorMsg}
					</Chip>
				)}

				{running && (
					<>
						<Input
							className="mb-2"
							onChange={(e) => setUserInput(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && sendInput()}
							placeholder="Enter input"
							value={userInput}
						/>
						<Button className="mr-2" onClick={sendInput}>
							Send Input
						</Button>
						<Button color="danger" onClick={terminateScript}>
							Terminate
						</Button>
					</>
				)}

				<ScrollShadow>
					<pre
						className="mt-4 h-64 overflow-auto rounded bg-black p-2 whitespace-pre-wrap text-white"
						ref={consoleRef}
					>
						{output || "[No output yet]"}
					</pre>
				</ScrollShadow>
			</CardBody>
		</Card>
	)
}

export default Compiler
