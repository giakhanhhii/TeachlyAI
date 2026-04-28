- **MUST NOT** read `data_output/` unless the user explicitly asks for it in the current conversation
- **APPLY INTELLIGENTLY**: Avoid creating or expanding god components / oversized source files in this project. For JS/TS/Python and similar logic-heavy files, prefer splitting responsibilities into smaller modules, helpers, or components when a file becomes hard to navigate or mixes too many concerns. Do **not** apply this mechanically to files where larger size is structurally necessary or already part of the intended design, especially `html`, `css`, and existing template files.

@RTK.md
