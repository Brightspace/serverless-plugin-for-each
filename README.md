# serverless-plugin-for-each

Serverless plugin that adds `$forEach` syntax to reduce code duplication and allow creating dynamic templates.

## Configuration

`$forEach` block requires two fields:

### iterator
A collection to iterate over. Can be:
  - *array*
    ```yaml
    iterator:
      - first
      - second
    ```
  - *object*
    ```yaml
    iterator:
      first: first-value
      second: second-value
    ```
  - *environment variable regular expression*
    ```yaml
    iterator:
      $env: ENVIRONMENT_VARIABLE_NAME_REGEX
    ```

### template
An array or object to replace `$forEach` block with. Template can contain `$forEach.key` and `$forEach.value` variables that are interpolated during the replacement. Depending on the iterator type, these variables are replaced with:
  - *array*:
    - `$forEach.key` - item index in the array
    - `$forEach.value` - item value
  - *object*:
    - `$forEach.key` - field name
    - `$forEach.value` - field value
  - *environment variable regular expression*:
    - `$forEach.key` - environment variable name
    - `$forEach.value` - environment variable value

When using an object type iterator, nested values can be accessed with dot notation, (e.g. `$forEach.value.nestedKey`).

## Examples

### Populate environment variables based on the object

#### Config
```yaml
service: my-service

provider:
  environment:
    LOG_LEVEL: info
    REGION: us-east-1
    $forEach:
      iterator: ${self:custom.queues}
      template:
        $forEach.key_QUEUE_URL:
          Fn::ImportValue: my-service-$forEach.value-url

custom:
  # this list does not need to be hardcoded here and can come from a file, for example
  queues:
    FIRST: first-queue
    SECOND: second-queue
```

#### Result

```yaml
service: my-service

provider:
  environment:
    LOG_LEVEL: info
    REGION: us-east-1
    FIRST_QUEUE_URL:
      Fn::ImportValue: my-service-first-queue-url
    SECOND_QUEUE_URL:
      Fn::ImportValue: my-service-second-queue-url

custom:
  # this list does not need to be hardcoded here and can come from a file, for example
  queues:
    FIRST: first-queue
    SECOND: second-queue
```

### Multiple $forEach blocks in the same object

#### Config
```yaml
service: my-service

provider:
  environment:
    LOG_LEVEL: info
    REGION: us-east-1
    $forEach_queues: # A "_suffix" can be added to avoid duplicated keys
      iterator: ${self:custom.queues}
      template:
        $forEach.key_QUEUE_URL:
          Fn::ImportValue: my-service-$forEach.value-url
    $forEach_tables:
      iterator: ${self:custom.tables}
      template:
        $forEach.key_TABLE_ARN:
          Fn::ImportValue: my-service-$forEach.value-arn

custom:
  queues:
    FIRST: first-queue
    SECOND: second-queue
  tables:
    ONE: table-one
    TWO: table-two
```

#### Result

```yaml
service: my-service

provider:
  environment:
    LOG_LEVEL: info
    REGION: us-east-1
    FIRST_QUEUE_URL:
      Fn::ImportValue: my-service-first-queue-url
    SECOND_QUEUE_URL:
      Fn::ImportValue: my-service-second-queue-url
    ONE_TABLE_ARN:
      Fn::ImportValue: my-service-one-table-arn
    TWO_TABLE_ARN:
      Fn::ImportValue: my-service-two-table-arn

custom:
  queues:
    FIRST: first-queue
    SECOND: second-queue
  tables:
    ONE: table-one
    TWO: table-two
```

### Attach multiple streams to lambda using environment variables

#### Config
```yaml
service: my-service

functions:
  helloWorld:
    handler: ./src/hello-world.js
    events:
      - $forEach:
          iterator:
            $env: STREAM_ARN$ # matches all env vars with this suffix
          template:
            - stream:
                arn: $forEach.value
                startingPosition: TRIM_HORIZON
                enabled: true
```

#### Result
Assuming you have `FIRST_STREAM_ARN=<first-stream-arn>` and `SECOND_STREAM_ARN=<second-stream-arn>` set, the configuration above would be converted into

```yaml
service: my-service

functions:
  helloWorld:
    handler: ./src/hello-world.js
    events:
      - stream:
          arn: <first-stream-arn>
          startingPosition: TRIM_HORIZON
          enabled: true
      - stream:
          arn: <second-stream-arn>
          startingPosition: TRIM_HORIZON
          enabled: true
```
