# API Integration Studio User Guide

The API Integration Studio is a comprehensive tool for designing, testing, and managing API requests within the CRM. This guide covers the main features and how to use them.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Configuration](#configuration)
3. [Building Requests](#building-requests)
4. [Viewing Responses](#viewing-responses)
5. [History & Presets](#history--presets)
6. [Role-Based Access Control](#role-based-access-control)
7. [Security & Privacy](#security--privacy)

## Getting Started
To access the API Studio, navigate to `/api-integration` in your browser. You will need to be logged in to your CRM account.

## Configuration
In the **Configure** tab, you can set the foundation of your API request:
- **Method**: Choose from GET, POST, PUT, or DELETE.
- **Endpoint URL**: Enter the full URL of the API resource.
- **Authentication**: 
  - **None**: For public APIs.
  - **Basic**: Enter username and password.
  - **Bearer**: Enter a JWT or other token.
- **Headers**: Add custom headers required by the API.

## Building Requests
The **Request** tab allows you to fine-tune your request:
- **Query Parameters**: Add key-value pairs that will be appended to the URL.
- **Request Body**: For POST and PUT methods, enter a JSON object in the text area. The editor supports basic formatting and syntax awareness.

## Viewing Responses
Once you click **Send Request**, you'll be taken to the **Response** tab:
- **Status & Time**: See the HTTP status code and how long the request took.
- **Syntax Highlighting**: The response body is formatted as JSON with syntax highlighting.
- **Headers**: View all headers returned by the server.
- **Download/Copy**: Use the icons to copy the response to your clipboard or download it as a JSON file.

## History & Presets
- **History Sidebar**: Every request you send is saved in the history (up to 50 items). Click on a history item to restore its configuration.
- **Mock Presets**: In the Configure tab, you can quickly load example API configurations to test the interface's capabilities.

## Role-Based Access Control
The Studio adapts based on your role:
- **ADMIN**: Full control over configuration, execution, and history management.
- **MANAGER**: Can configure and execute requests, but cannot delete history.
- **USER**: Can execute pre-configured requests and view history.
- **WORKER**: Can only view history of previous executions.

## Security & Privacy
- **Credential Redaction**: Sensitive information like passwords and tokens are redacted (replaced with `********`) before being saved to the local history.
- **Data Persistence**: History is stored locally in your browser's `localStorage` and is never sent to our servers.

## Troubleshooting
- **Network Errors**: Ensure the endpoint is reachable and CORS (Cross-Origin Resource Sharing) is enabled on the server.
- **Rate Limiting**: The Studio automatically retries requests that return a `429 Too Many Requests` status using exponential backoff.
