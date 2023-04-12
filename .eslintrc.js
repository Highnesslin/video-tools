module.exports = {
  root: true,
  extends: [
    'plugin:prettier/recommended',
  ],
  plugins: ["@typescript-eslint"],
  rules: {
    "complexity": "off",
    "global-require": 0 ,
    "operator-linebreak": [
        "error",
        "before",
        {
            "overrides": {
                "=": "after"
            }
        }
    ],
    "camelcase": [
        "off",
        {
            "allow": ["^UNSAFE_"]
        }
    ],
    "no-use-before-define": "off",
    "@typescript-eslint/no-use-before-define": ["error"],
    // 为了兼容老代码
    "max-len": "warn",
    "no-return-assign": "warn",
    "no-unused-vars": "off",
    "no-console": "warn",
    "no-unreachable-loop": "off",
    "react-hooks/exhaustive-deps": "off",
    // TODO: 有BUG待官方修复：https://github.com/babel/eslint-plugin-babel/issues/180
    "babel/object-curly-spacing": "off",
    // `useEffect`特别容易弄坏这个规则
    "consistent-return": "off",
    "no-param-reassign": ["warn", {"ignorePropertyModificationsFor": ["current"]}],
    // 与ES6参数默认值冲突
    "react/require-default-props": "off",
    // TODO: 这条规则太复杂，暂时配不出来，基本检查由`camelcase`规则负责
    "@typescript-eslint/naming-convention": "off",
    // 这条规则与实际业务有冲突
    "@typescript-eslint/await-thenable": "off",
    // 官方已经有对应规则
    "@typescript-eslint/no-var-requires": "off",
    "@typescript-eslint/no-require-imports": "off",
    "no-trailing-spaces": 1,
    "no-unused-expressions": "off",
    "no-restricted-properties": [
        2,
        {
          "object": "window",
          "property": "React"
        },
        {
            "object": "window",
            "property": "ReactDom"
          }
    ]
  }
}
