package:
    npm run package

test:
    npm run test

lint:
    npm run lint

fix:
    npm run lint -- --fix

format:
    npx prettier --write "src/**/*.ts"
