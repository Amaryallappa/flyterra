# AI Development Rules

This document defines the mandatory workflow for any AI agent interacting with this project.

## Core Rule: Documentation-First Workflow
> [!IMPORTANT]
> **Before editing any page in the `src/pages` directory, the AI MUST first read the corresponding `.md` file in `src/pages_mockup`.**

1.  **Read Mockup**: Locate and read the `.md` file for the page you are about to edit. This file defines the intended logic, functionality, and structure.
2.  **Verify Alignment**: Ensure your proposed changes align with the documented purpose of the page.
3.  **Update Mockup**: If your edit adds new functions, changes existing logic, or modifies state management, you **MUST update the `.md` mockup file** to reflect these changes *before* finishing the task.
4.  **Consistency**: Maintain the same structure and design patterns described in the mockup files.

## Page-Specific Rules
Each `.md` file in `src/pages_mockup` serves as the specification for its corresponding `.tsx` file. Do not deviate from the documented logic without a clear reason and an update to the documentation.

## Feedback Loop
If you find that a mockup file is outdated or missing details, update it immediately to help future AI iterations.
