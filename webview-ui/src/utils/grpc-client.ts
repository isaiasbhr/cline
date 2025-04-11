import { vscode } from "./vscode"
import { v4 as uuidv4 } from "uuid"

// Generic type for any protobuf service definition
type ProtoService = {
	name: string
	fullName: string
	methods: {
		[key: string]: {
			name: string
			requestType: any
			responseType: any
			requestStream: boolean
			responseStream: boolean
			options: any
		}
	}
}

// Create a client for any protobuf service
export function createGrpcClient<T>(service: ProtoService): T {
	const client = {} as T

	// For each method in the service
	Object.values(service.methods).forEach((method) => {
		// Create a function that matches the method signature
		client[method.name as keyof T] = ((request: any) => {
			return new Promise((resolve, reject) => {
				const requestId = uuidv4()

				// Set up one-time listener for this specific request
				const handleResponse = (event: MessageEvent) => {
					const message = event.data
					if (message.type === "grpc_response" && message.grpc_response?.request_id === requestId) {
						// Remove listener once we get our response
						window.removeEventListener("message", handleResponse)

						if (message.grpc_response.error) {
							reject(new Error(message.grpc_response.error))
						} else {
							// Convert JSON back to protobuf message
							const responseType = method.responseType
							const response = responseType.fromJSON(message.grpc_response.message)
							console.log("[DEBUG] grpc-client sending response:", response)
							resolve(response)
						}
					}
				}

				window.addEventListener("message", handleResponse)

				let encodedRequest = "{}"
				if (Object.keys(request).length !== 0) {
					encodedRequest = request.toJSON()
					console.log("[DEBUG] request is", request, encodedRequest)
				}

				// Send the request
				vscode.postMessage({
					type: "grpc_request",
					grpc_request: {
						service: service.fullName,
						method: method.name,
						message: encodedRequest, // Convert protobuf to JSON
						request_id: requestId,
					},
				})
			})
		}) as any
	})

	return client
}
