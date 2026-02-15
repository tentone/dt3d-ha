// eslint.config.js
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import lit from "eslint-plugin-lit";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import importPlugin from "eslint-plugin-import";

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	lit.configs["flat/recommended"],

	{
		files:["**/*.ts"],
		languageOptions:{
			parser:tseslint.parser,
			parserOptions:{
				project:true,
				sourceType:"module",
				ecmaVersion:"latest"
			}
		},
		plugins:{
			"simple-import-sort":simpleImportSort,
			import:importPlugin
		},
		rules:{
			"@typescript-eslint/no-explicit-any":"off",
			"no-case-declarations": "off",
			"@typescript-eslint/no-unused-expressions": "off",
			"no-undef": "off",
			
			// Tabs indentation
			indent:["error","tab",{
				SwitchCase:1,
				ignoredNodes:[
					"TemplateLiteral",
					"TaggedTemplateExpression",
					"TaggedTemplateExpression *"
				]
			}],
			"no-mixed-spaces-and-tabs":["error","smart-tabs"],


			// Remove unnecessary spaces
			"no-trailing-spaces":"error",
			"eol-last":["error","always"],
			"object-curly-spacing":["error","never"],
			"array-bracket-spacing":["error","never"],
			"space-in-parens":["error","never"],
			"block-spacing":["error","never"],
			"padded-blocks":["error","never"],

			// Double quotes
			quotes:["error","double",{avoidEscape:true}],

			// Semicolons
			semi:["error","always"],

			// Import sorting
			"simple-import-sort/imports":"error",
			"simple-import-sort/exports":"error",
			"import/newline-after-import":["error",{count:1}],
			"import/no-duplicates":"error",

			// TypeScript cleanup
			"@typescript-eslint/no-unused-vars":[
				"error",
				{argsIgnorePattern:"^_",varsIgnorePattern:"^_"}
			],
			"@typescript-eslint/consistent-type-imports":[
				"error",
				{prefer:"type-imports"}
			]
		}
	}
];
