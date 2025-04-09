import { VSCodeCheckbox, VSCodeTextField } from "@vscode/webview-ui-toolkit/react"
import { useCallback, useState } from "react"
import styled from "styled-components"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { AutoApprovalSettings } from "@shared/AutoApprovalSettings"
import { vscode } from "@/utils/vscode"
import { getAsVar, VSC_FOREGROUND, VSC_TITLEBAR_INACTIVE_FOREGROUND, VSC_DESCRIPTION_FOREGROUND } from "@/utils/vscStyles"

interface AutoApproveMenuProps {
	style?: React.CSSProperties
}

const SubOptionAnimateIn = styled.div<{ show: boolean }>`
	max-height: ${(props) => (props.show ? "100px" : "0")};
	opacity: ${(props) => (props.show ? "1" : "0")};
	overflow: hidden;
	transition:
		max-height 0.2s ease-in-out,
		opacity 0.2s ease-in-out;
`

const ACTION_METADATA: {
	id: keyof AutoApprovalSettings["actions"]
	label: string
	shortName: string
	description: string
}[] = [
	{
		id: "readFilesLocally",
		label: "Read local files and directories",
		shortName: "Read Local",
		description: "Allows Cline to read files within your workspace.",
	},
	{
		id: "readFilesExternally",
		label: "Read files and directories anywhere",
		shortName: "Read External",
		description: "Allows Cline to read any file on your computer.",
	},
	{
		id: "editFilesLocally",
		label: "Edit files",
		shortName: "Edit",
		description: "Allows Cline to modify files within your workspace.",
	},
	{
		id: "editFilesExternally",
		label: "Edit external files",
		shortName: "Edit (External)",
		description: "Allows Cline to modify any file on your computer.",
	},
	{
		id: "executeSafeCommands",
		label: "Execute safe commands",
		shortName: "Safe Commands",
		description: "Allows execution of safe terminal commands.",
	},
	{
		id: "executeAllCommands",
		label: "Execute all commands",
		shortName: "All Commands",
		description: "Allows execution of all terminal commands.",
	},
	{
		id: "useBrowser",
		label: "Use the browser",
		shortName: "Browser",
		description: "Allows Cline to launch and interact with websites in a browser.",
	},
	{
		id: "useMcp",
		label: "Use MCP servers",
		shortName: "MCP",
		description: "Allows Cline to use configured MCP servers which may modify filesystem or interact with APIs.",
	},
]

const AutoApproveMenu = ({ style }: AutoApproveMenuProps) => {
	const { autoApprovalSettings } = useExtensionState()
	const [isExpanded, setIsExpanded] = useState(false)
	const [isHoveringCollapsibleSection, setIsHoveringCollapsibleSection] = useState(false)
	// Careful not to use partials to mutate since spread operator only does shallow copy

	const enabledActions = ACTION_METADATA.filter((action) => autoApprovalSettings.actions[action.id])
	const enabledActionsList = (() => {
		// When nested auto-approve options are used, display the more permissive one (file reads, edits, and commands)
		const readFilesEnabled = enabledActions.some((action) => action.id === "readFilesLocally")
		const readFilesExternallyEnabled = enabledActions.some((action) => action.id === "readFilesExternally")

		const editFilesEnabled = enabledActions.some((action) => action.id === "editFilesLocally")
		const editFilesExternallyEnabled = enabledActions.some((action) => action.id === "editFilesExternally")

		const safeCommandsEnabled = enabledActions.some((action) => action.id === "executeSafeCommands")
		const allCommandsEnabled = enabledActions.some((action) => action.id === "executeAllCommands")
		// Filter out the potentially nested options so we don't display them twice
		const otherActions = enabledActions
			.filter(
				(action) =>
					action.id !== "readFilesLocally" &&
					action.id !== "readFilesExternally" &&
					action.id !== "editFilesLocally" &&
					action.id !== "editFilesExternally" &&
					action.id !== "executeSafeCommands" &&
					action.id !== "executeAllCommands",
			)
			.map((action) => action.shortName)

		const labels = []

		// Handle read editing labels
		if (readFilesExternallyEnabled) {
			labels.push("Read (External)")
		} else if (readFilesEnabled) {
			labels.push("Read")
		}

		// Handle file editing labels
		if (editFilesExternallyEnabled) {
			labels.push("Edit (External)")
		} else if (editFilesEnabled) {
			labels.push("Edit")
		}

		// Handle command execution labels
		if (allCommandsEnabled) {
			labels.push("All Commands")
		} else if (safeCommandsEnabled) {
			labels.push("Safe Commands")
		}

		// Add remaining actions
		return [...labels, ...otherActions].join(", ")
	})()
	const hasEnabledActions = enabledActions.length > 0

	const updateEnabled = useCallback(
		(enabled: boolean) => {
			vscode.postMessage({
				type: "autoApprovalSettings",
				autoApprovalSettings: {
					...autoApprovalSettings,
					enabled,
				},
			})
		},
		[autoApprovalSettings],
	)

	const updateAction = useCallback(
		(actionId: keyof AutoApprovalSettings["actions"], value: boolean) => {
			// Calculate what the new actions state will be
			const newActions = {
				...autoApprovalSettings.actions,
				[actionId]: value,
			}

			// Check if this will result in any enabled actions
			const willHaveEnabledActions = Object.values(newActions).some(Boolean)

			vscode.postMessage({
				type: "autoApprovalSettings",
				autoApprovalSettings: {
					...autoApprovalSettings,
					actions: newActions,
					// If no actions will be enabled, ensure the main toggle is off
					enabled: willHaveEnabledActions ? autoApprovalSettings.enabled : false,
				},
			})
		},
		[autoApprovalSettings],
	)

	const updateMaxRequests = useCallback(
		(maxRequests: number) => {
			vscode.postMessage({
				type: "autoApprovalSettings",
				autoApprovalSettings: {
					...autoApprovalSettings,
					maxRequests,
				},
			})
		},
		[autoApprovalSettings],
	)

	const updateNotifications = useCallback(
		(enableNotifications: boolean) => {
			vscode.postMessage({
				type: "autoApprovalSettings",
				autoApprovalSettings: {
					...autoApprovalSettings,
					enableNotifications,
				},
			})
		},
		[autoApprovalSettings],
	)

	return (
		<div
			style={{
				padding: "0 15px",
				userSelect: "none",
				borderTop: isExpanded
					? `0.5px solid color-mix(in srgb, ${getAsVar(VSC_TITLEBAR_INACTIVE_FOREGROUND)} 20%, transparent)`
					: "none",
				overflowY: "auto",
				...style,
			}}>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
					padding: isExpanded ? "8px 0" : "8px 0 0 0",
					cursor: !hasEnabledActions ? "pointer" : "default",
				}}
				onMouseEnter={() => {
					if (!hasEnabledActions) {
						setIsHoveringCollapsibleSection(true)
					}
				}}
				onMouseLeave={() => {
					if (!hasEnabledActions) {
						setIsHoveringCollapsibleSection(false)
					}
				}}
				onClick={() => {
					if (!hasEnabledActions) {
						setIsExpanded((prev) => !prev)
					}
				}}>
				<VSCodeCheckbox
					style={{
						pointerEvents: hasEnabledActions ? "auto" : "none",
					}}
					checked={hasEnabledActions && autoApprovalSettings.enabled}
					disabled={!hasEnabledActions}
					// onChange={(e) => {
					// 	const checked = (e.target as HTMLInputElement).checked
					// 	updateEnabled(checked)
					// }}
					onClick={(e) => {
						/*
						vscode web toolkit bug: when changing the value of a vscodecheckbox programmatically, it will call its onChange with stale state. This led to updateEnabled being called with an old version of autoApprovalSettings, effectively undoing the state change that was triggered by the last action being unchecked. A simple workaround is to just not use onChange and instead use onClick. We are lucky this is a checkbox and the newvalue is simply opposite of current state.
						*/
						if (!hasEnabledActions) return
						e.stopPropagation() // stops click from bubbling up to the parent, in this case stopping the expanding/collapsing
						updateEnabled(!autoApprovalSettings.enabled)
					}}
				/>
				<CollapsibleSection
					isHovered={isHoveringCollapsibleSection}
					style={{ cursor: "pointer" }}
					onClick={() => {
						// to prevent this from counteracting parent
						if (hasEnabledActions) {
							setIsExpanded((prev) => !prev)
						}
					}}>
					<span
						style={{
							color: getAsVar(VSC_FOREGROUND),
							whiteSpace: "nowrap",
						}}>
						Auto-approve:
					</span>
					<span
						style={{
							whiteSpace: "nowrap",
							overflow: "hidden",
							textOverflow: "ellipsis",
						}}>
						{enabledActions.length === 0 ? "None" : enabledActionsList}
					</span>
					<span
						className={`codicon codicon-chevron-${isExpanded ? "down" : "right"}`}
						style={{
							flexShrink: 0,
							marginLeft: isExpanded ? "2px" : "-2px",
						}}
					/>
				</CollapsibleSection>
			</div>
			{isExpanded && (
				<div style={{ padding: "0" }}>
					<div
						style={{
							marginBottom: "10px",
							color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
							fontSize: "12px",
						}}>
						Auto-approve allows Cline to perform the following actions without asking for permission. Please use with
						caution and only enable if you understand the risks.
					</div>
					{ACTION_METADATA.map((action) => {
						// Handle readFilesExternally, editFilesExternally, and executeAllCommands as animated sub-options
						if (
							action.id === "executeAllCommands" ||
							action.id === "editFilesExternally" ||
							action.id === "readFilesExternally"
						) {
							//const parentAction = action.id === "executeAllCommands" ? "executeSafeCommands" : "editFilesLocally"

							const parentAction =
								action.id === "executeAllCommands"
									? "executeSafeCommands"
									: action.id === "readFilesExternally"
										? "readFilesLocally"
										: "editFilesLocally"
							return (
								<SubOptionAnimateIn key={action.id} show={autoApprovalSettings.actions[parentAction]}>
									<div
										style={{
											margin: "6px 0",
											marginLeft: "28px",
										}}>
										<VSCodeCheckbox
											checked={autoApprovalSettings.actions[action.id]}
											onChange={(e) => {
												const checked = (e.target as HTMLInputElement).checked
												updateAction(action.id, checked)
											}}>
											{action.label}
										</VSCodeCheckbox>
										<div
											style={{
												marginLeft: "28px",
												color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
												fontSize: "12px",
											}}>
											{action.description}
										</div>
									</div>
								</SubOptionAnimateIn>
							)
						}
						return (
							<div
								key={action.id}
								style={{
									margin: "3px 0",
								}}>
								<VSCodeCheckbox
									checked={autoApprovalSettings.actions[action.id]}
									onChange={(e) => {
										const checked = (e.target as HTMLInputElement).checked
										updateAction(action.id, checked)
									}}>
									{action.label}
								</VSCodeCheckbox>
								<div
									style={{
										marginLeft: "28px",
										color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
										fontSize: "12px",
									}}>
									{action.description}
								</div>
							</div>
						)
					})}
					<div
						style={{
							height: "0.5px",
							background: getAsVar(VSC_TITLEBAR_INACTIVE_FOREGROUND),
							margin: "15px 0",
							opacity: 0.2,
						}}
					/>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							gap: "8px",
							marginTop: "10px",
							marginBottom: "8px",
							color: getAsVar(VSC_FOREGROUND),
						}}>
						<span style={{ flexShrink: 1, minWidth: 0 }}>Max Requests:</span>
						<VSCodeTextField
							// placeholder={DEFAULT_AUTO_APPROVAL_SETTINGS.maxRequests.toString()}
							value={autoApprovalSettings.maxRequests.toString()}
							onInput={(e) => {
								const input = e.target as HTMLInputElement
								// Remove any non-numeric characters
								input.value = input.value.replace(/[^0-9]/g, "")
								const value = parseInt(input.value)
								if (!isNaN(value) && value > 0) {
									updateMaxRequests(value)
								}
							}}
							onKeyDown={(e) => {
								// Prevent non-numeric keys (except for backspace, delete, arrows)
								if (!/^\d$/.test(e.key) && !["Backspace", "Delete", "ArrowLeft", "ArrowRight"].includes(e.key)) {
									e.preventDefault()
								}
							}}
							style={{ flex: 1 }}
						/>
					</div>
					<div
						style={{
							color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
							fontSize: "12px",
							marginBottom: "10px",
						}}>
						Cline will automatically make this many API requests before asking for approval to proceed with the task.
					</div>
					<div style={{ margin: "6px 0" }}>
						<VSCodeCheckbox
							checked={autoApprovalSettings.enableNotifications}
							onChange={(e) => {
								const checked = (e.target as HTMLInputElement).checked
								updateNotifications(checked)
							}}>
							Enable Notifications
						</VSCodeCheckbox>
						<div
							style={{
								marginLeft: "28px",
								color: getAsVar(VSC_DESCRIPTION_FOREGROUND),
								fontSize: "12px",
							}}>
							Receive system notifications when Cline requires approval to proceed or when a task is completed.
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

const CollapsibleSection = styled.div<{ isHovered?: boolean }>`
	display: flex;
	align-items: center;
	gap: 4px;
	color: ${(props) => (props.isHovered ? getAsVar(VSC_FOREGROUND) : getAsVar(VSC_DESCRIPTION_FOREGROUND))};
	flex: 1;
	min-width: 0;

	&:hover {
		color: ${getAsVar(VSC_FOREGROUND)};
	}
`

export default AutoApproveMenu
