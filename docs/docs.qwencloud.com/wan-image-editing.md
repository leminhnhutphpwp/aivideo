> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Image editing - Wan2.7/2.6/2.5

> Edit images using text instructions with Wan2.7, 2.6, and 2.5 models.

The Wan image editing model series supports multi-image input and output. You can use text instructions to perform tasks such as image editing, multi-image fusion, subject feature preservation, and object detection and segmentation.

## Getting started

This example shows how to use the `wan2.7-image-pro` model to generate an edited image based on two input images and a prompt.

Prompt: Spray the graffiti from image 2 onto the car in image 1

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "19%", paddingBottom: "8px"}}>**Input image 1**</th>
      <th style={{textAlign: "left", width: "41%", paddingBottom: "8px"}}>**Input image 2**</th>
      <th style={{textAlign: "left", width: "40%", paddingBottom: "8px"}}>**Output image (wan2.7-image-pro)**</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="car" src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="paint" src="https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="output" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1063463.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

<Tabs>
  <Tab title="Synchronous call">
    <Note>**Important** Ensure that your DashScope Python SDK is version `1.25.15` or later, and your DashScope Java SDK is version `2.22.13` or later.</Note>

    <CodeGroup>
      ```python Python
      import os
      import base64
      import mimetypes
      import urllib.request
      import dashscope
      from dashscope.aigc.image_generation import ImageGeneration
      from dashscope.api_entities.dashscope_response import Message

      dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"

      # If you have not set an environment variable, replace the next line with: api_key="sk-xxx"
      api_key = os.getenv("DASHSCOPE_API_KEY")

      def encode_file(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type or not mime_type.startswith("image/"):
          raise ValueError("Unsupported or unrecognized image format")
        with open(file_path, "rb") as image_file:
          encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:{mime_type};base64,{encoded_string}"

      # [Method 1] Use a public image URL
      image_1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"
      image_2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"

      # [Method 2] Use a local file (supports absolute and relative paths)
      # image_1 = "file:///path/to/your/car.png"
      # image_2 = "file:///path/to/your/paint.png"

      # [Method 3] Use a Base64-encoded image
      # image_1 = encode_file("/path/to/your/car.png")
      # image_2 = encode_file("/path/to/your/paint.png")

      message = Message(
        role="user",
        content=[
          {"text": "Spray the graffiti from image 2 onto the car in image 1"},
          {"image": image_1},
          {"image": image_2},
        ],
      )
      print("----sync call, please wait a moment----")
      rsp = ImageGeneration.call(
        model="wan2.7-image-pro",
        api_key=api_key,
        messages=[message],
        watermark=False,
        n=1,
        # wan2.7-image-pro supports 4K only for text-to-image. Image editing supports up to 2K.
        size="2K",
      )

      if rsp.status_code == 200:
        for i, choice in enumerate(rsp.output.choices):
          for j, content in enumerate(choice["message"]["content"]):
            if content.get("type") == "image":
              image_url = content["image"]
              file_name = f"output_{i}_{j}.png"
              # The result URL is valid for 24 hours. Download it promptly.
              urllib.request.urlretrieve(image_url, file_name)
              print(f"Image saved to {file_name}")
      else:
        print(f"Failed: status_code={rsp.status_code}, message={rsp.message}")
      ```

      ```java Java
      import com.alibaba.dashscope.aigc.imagegeneration.*;
      import com.alibaba.dashscope.exception.ApiException;
      import com.alibaba.dashscope.exception.NoApiKeyException;
      import com.alibaba.dashscope.exception.UploadFileException;
      import com.alibaba.dashscope.utils.Constants;
      import com.alibaba.dashscope.utils.JsonUtils;

      import java.io.IOException;
      import java.io.InputStream;
      import java.net.URL;
      import java.nio.file.Files;
      import java.nio.file.Paths;
      import java.nio.file.StandardCopyOption;
      import java.util.Arrays;
      import java.util.Base64;
      import java.util.Collections;
      import java.util.List;
      import java.util.Map;

      public class Main {

        static {
          Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // If you have not configured the environment variable, replace the following line with: apiKey="sk-xxx"
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        // Base64 encoding: data:{MIME_type};base64,{base64_data}
        public static String encodeFile(String filePath) throws IOException {
          byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
          String base64String = Base64.getEncoder().encodeToString(fileContent);
          String mimeType = Files.probeContentType(Paths.get(filePath));
          return "data:" + mimeType + ";base64," + base64String;
        }

        public static void basicCall() throws ApiException, NoApiKeyException, UploadFileException, IOException {
          // [Method 1] Use a public image URL
          String image1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp";
          String image2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp";

          // [Method 2] Use a local file
          // String image1 = "file:///path/to/your/car.png";
          // String image2 = "file:///path/to/your/paint.png";

          // [Method 3] Use a Base64-encoded image
          // String image1 = encodeFile("/path/to/your/car.png");
          // String image2 = encodeFile("/path/to/your/paint.png");

          ImageGenerationMessage message = ImageGenerationMessage.builder()
              .role("user")
              .content(Arrays.asList(
                  Collections.singletonMap("text", "Spray the graffiti from image 2 onto the car in image 1"),
                  Collections.singletonMap("image", image1),
                  Collections.singletonMap("image", image2)
              )).build();

          ImageGenerationParam param = ImageGenerationParam.builder()
              .apiKey(apiKey)
              .model("wan2.7-image-pro")
              .messages(Collections.singletonList(message))
              .n(1)
              // wan2.7-image-pro supports 4K only for text-to-image. Image editing supports up to 2K.
              .size("2K")
              .build();

          ImageGeneration imageGeneration = new ImageGeneration();
          ImageGenerationResult result = null;
          try {
            System.out.println("---sync call for image editing, please wait a moment----");
            result = imageGeneration.call(param);
          } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
          }
          // Extract the result image URL and save it locally
          for (int i = 0; i < result.getOutput().getChoices().size(); i++) {
            List<Map<String, Object>> contents = result.getOutput().getChoices().get(i)
                .getMessage().getContent();
            for (int j = 0; j < contents.size(); j++) {
              if ("image".equals(contents.get(j).get("type"))) {
                String imageUrl = (String) contents.get(j).get("image");
                String fileName = "output_" + i + "_" + j + ".png";
                // The result URL is valid for 24 hours. Download it promptly.
                try (InputStream in = new URL(imageUrl).openStream()) {
                  Files.copy(in, Paths.get(fileName), StandardCopyOption.REPLACE_EXISTING);
                }
                System.out.println("Image saved to " + fileName);
              }
            }
          }
        }

        public static void main(String[] args) throws ApiException, NoApiKeyException, UploadFileException, IOException {
          basicCall();
        }
      }
      ```

      ```bash curl
      curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation' \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
      --data '{
          "model": "wan2.7-image-pro",
          "input": {
              "messages": [
                  {
                      "role": "user",
                      "content": [
                          {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"},
                          {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"},
                          {"text": "Spray-paint the graffiti from image 2 onto the car in image 1"}
                      ]
                  }
              ]
          },
          "parameters": {
              "size": "2K",
              "n": 1,
              "watermark": false
          }
      }'
      ```
    </CodeGroup>

    **Response example**

    <Accordion title="Full JSON response">
      ```json
      {
          "output": {
              "choices": [
                  {
                      "finish_reason": "stop",
                      "message": {
                          "content": [
                              {
                                  "image": "https://dashscope-xxx.oss-xxx.aliyuncs.com/xxx.png?Expires=xxx",
                                  "type": "image"
                              }
                          ],
                          "role": "assistant"
                      }
                  }
              ],
              "finished": true
          },
          "usage": {
              "image_count": 1,
              "input_tokens": 10867,
              "output_tokens": 2,
              "size": "1488*704",
              "total_tokens": 10869
          },
          "request_id": "71dfc3c6-f796-9972-97e4-bc4efc4faxxx"
      }
      ```
    </Accordion>
  </Tab>

  <Tab title="Asynchronous call">
    <Note>**Important** Ensure that your DashScope Python SDK is version `1.25.15` or later, and your DashScope Java SDK is version `2.22.13` or later.</Note>

    <CodeGroup>
      ```python Python
      import os
      import base64
      import mimetypes
      import urllib.request
      import dashscope
      from dashscope.aigc.image_generation import ImageGeneration
      from dashscope.api_entities.dashscope_response import Message
      from http import HTTPStatus

      dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"

      # If you have not set an environment variable, replace the next line with: api_key="sk-xxx"
      api_key = os.getenv("DASHSCOPE_API_KEY")

      def encode_file(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type or not mime_type.startswith("image/"):
          raise ValueError("Unsupported or unrecognized image format")
        with open(file_path, "rb") as image_file:
          encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        return f"data:{mime_type};base64,{encoded_string}"

      # [Method 1] Use a public image URL
      image_1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"
      image_2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"

      # [Method 2] Use a local file (supports absolute and relative paths)
      # image_1 = "file:///path/to/your/car.png"
      # image_2 = "file:///path/to/your/paint.png"

      # [Method 3] Use a Base64-encoded image
      # image_1 = encode_file("/path/to/your/car.png")
      # image_2 = encode_file("/path/to/your/paint.png")

      def create_async_task():
        print("Creating async task...")
        message = Message(
          role="user",
          content=[
            {"text": "Spray the graffiti from image 2 onto the car in image 1"},
            {"image": image_1},
            {"image": image_2},
          ],
        )
        response = ImageGeneration.async_call(
          model="wan2.7-image-pro",
          api_key=api_key,
          messages=[message],
          watermark=False,
          n=1,
          # wan2.7-image-pro supports 4K only for text-to-image. Image editing supports up to 2K.
          size="2K",
        )

        if response.status_code == 200:
          print("Task created successfully:", response)
          return response
        else:
          raise Exception(f"Failed to create task: {response.code} - {response.message}")

      def wait_for_completion(task_response):
        print("Waiting for task completion...")
        status = ImageGeneration.wait(task=task_response, api_key=api_key)

        if status.output.task_status == "SUCCEEDED":
          print("Task succeeded!")
          for i, choice in enumerate(status.output.choices):
            for j, content in enumerate(choice["message"]["content"]):
              if content.get("type") == "image":
                image_url = content["image"]
                file_name = f"output_{i}_{j}.png"
                # The result URL is valid for 24 hours. Download it promptly.
                urllib.request.urlretrieve(image_url, file_name)
                print(f"Image saved to {file_name}")
        else:
          raise Exception(f"Task failed with status: {status.output.task_status}")

      def fetch_task_status(task):
        print("Fetching task status...")
        status = ImageGeneration.fetch(task=task, api_key=api_key)

        if status.status_code == HTTPStatus.OK:
          print("Task status:", status.output.task_status)
          print("Response details:", status)
        else:
          print(f"Failed to fetch status: {status.code} - {status.message}")

      def cancel_task(task):
        print("Canceling task...")
        response = ImageGeneration.cancel(task=task, api_key=api_key)

        if response.status_code == HTTPStatus.OK:
          print("Task canceled successfully:", response.output.task_status)
        else:
          print(f"Failed to cancel task: {response.code} - {response.message}")

      if __name__ == "__main__":
        task = create_async_task()
        wait_for_completion(task)
      ```

      ```java Java
      import com.alibaba.dashscope.aigc.imagegeneration.*;
      import com.alibaba.dashscope.exception.ApiException;
      import com.alibaba.dashscope.exception.NoApiKeyException;
      import com.alibaba.dashscope.exception.UploadFileException;
      import com.alibaba.dashscope.utils.Constants;
      import com.alibaba.dashscope.utils.JsonUtils;

      import java.io.IOException;
      import java.io.InputStream;
      import java.net.URL;
      import java.nio.file.Files;
      import java.nio.file.Paths;
      import java.nio.file.StandardCopyOption;
      import java.util.Arrays;
      import java.util.Base64;
      import java.util.Collections;
      import java.util.List;
      import java.util.Map;

      public class Main {

        static {
          Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // If you have not configured the environment variable, replace the following line with: apiKey="sk-xxx"
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        // --- Base64 encoding function ---
        // Base64 encoding format: data:{MIME_type};base64,{base64_data}
        public static String encodeFile(String filePath) throws IOException {
          byte[] fileContent = Files.readAllBytes(Paths.get(filePath));
          String base64String = Base64.getEncoder().encodeToString(fileContent);
          String mimeType = Files.probeContentType(Paths.get(filePath));
          return "data:" + mimeType + ";base64," + base64String;
        }

        public static void asyncCall() throws ApiException, NoApiKeyException, UploadFileException, IOException {
          // [Method 1] Use a public image URL
          String image1 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp";
          String image2 = "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp";

          // [Method 2] Use a local file (supports absolute and relative paths)
          // String image1 = "file:///path/to/your/car.png";
          // String image2 = "file:///path/to/your/paint.png";

          // [Method 3] Use a Base64-encoded image
          // String image1 = encodeFile("/path/to/your/car.png");
          // String image2 = encodeFile("/path/to/your/paint.png");

          ImageGenerationMessage message = ImageGenerationMessage.builder()
            .role("user")
            .content(Arrays.asList(
              Collections.singletonMap("text", "Spray the graffiti from image 2 onto the car in image 1"),
              Collections.singletonMap("image", image1),
              Collections.singletonMap("image", image2)
            )).build();

          ImageGenerationParam param = ImageGenerationParam.builder()
            .apiKey(apiKey)
            .model("wan2.7-image-pro")
            .n(1)
            // wan2.7-image-pro supports 4K only for text-to-image. Image editing supports up to 2K.
            .size("2K")
            .messages(Arrays.asList(message))
            .build();

          ImageGeneration imageGeneration = new ImageGeneration();
          ImageGenerationResult result = null;
          try {
            System.out.println("---async call for image editing, creating task----");
            result = imageGeneration.asyncCall(param);
          } catch (ApiException | NoApiKeyException | UploadFileException e) {
            throw new RuntimeException(e.getMessage());
          }
          System.out.println("Task creation result:");
          System.out.println(JsonUtils.toJson(result));

          String taskId = result.getOutput().getTaskId();
          waitTask(taskId);
        }

        public static void waitTask(String taskId) throws ApiException, NoApiKeyException, IOException {
          ImageGeneration imageGeneration = new ImageGeneration();
          System.out.println("\n---waiting for task completion----");
          ImageGenerationResult result = imageGeneration.wait(taskId, apiKey);
          for (int i = 0; i < result.getOutput().getChoices().size(); i++) {
            List<Map<String, Object>> contents = result.getOutput().getChoices().get(i)
              .getMessage().getContent();
            for (int j = 0; j < contents.size(); j++) {
              if ("image".equals(contents.get(j).get("type"))) {
                String imageUrl = (String) contents.get(j).get("image");
                String fileName = "output_" + i + "_" + j + ".png";
                // The result URL is valid for 24 hours. Download it promptly.
                try (InputStream in = new URL(imageUrl).openStream()) {
                  Files.copy(in, Paths.get(fileName), StandardCopyOption.REPLACE_EXISTING);
                }
                System.out.println("Image saved to " + fileName);
              }
            }
          }
        }

        public static void main(String[] args) throws ApiException, NoApiKeyException, UploadFileException, IOException {
          asyncCall();
        }
      }
      ```

      ```bash curl (Step 1: Submit task)
      curl --location 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/image-generation/generation' \
      --header 'Content-Type: application/json' \
      --header "Authorization: Bearer $DASHSCOPE_API_KEY" \
      --header 'X-DashScope-Async: enable' \
      --data '{
        "model": "wan2.7-image-pro",
        "input": {
          "messages": [
            {
              "role": "user",
              "content": [
                {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/pjeqdf/car.webp"},
                {"image": "https://help-static-aliyun-doc.aliyuncs.com/file-manage-files/zh-CN/20251229/xsunlm/paint.webp"},
                {"text": "Spray-paint the graffiti from image 2 onto the car in image 1"}
              ]
            }
          ]
        },
        "parameters": {
          "size": "2K",
          "n": 1,
          "watermark": false
        }
      }'
      ```

      ```bash curl (Step 2: Query result)
      curl -X GET 'https://dashscope-intl.aliyuncs.com/api/v1/tasks/{task_id}' \
      --header "Authorization: Bearer $DASHSCOPE_API_KEY"
      ```
    </CodeGroup>

    **Response example**

    <Accordion title="Full JSON response">
      ```json
      {
          "output": {
              "task_id": "127ec645-118f-4884-955d-0eba8dxxxxxx",
              "task_status": "SUCCEEDED",
              "choices": [
                  {
                      "finish_reason": "stop",
                      "message": {
                          "content": [
                              {
                                  "image": "https://dashscope-xxx.oss-xxx.aliyuncs.com/xxx.png?Expires=xxx",
                                  "type": "image"
                              }
                          ],
                          "role": "assistant"
                      }
                  }
              ],
              "finished": true
          },
          "usage": {
              "image_count": 1,
              "input_tokens": 10867,
              "output_tokens": 2,
              "size": "1488*704",
              "total_tokens": 10869
          },
          "request_id": "4fb3050f-de57-4a24-84ff-e37ee5xxxxxx"
      }
      ```
    </Accordion>
  </Tab>
</Tabs>

<Accordion title="View wan2.5-i2i-preview call examples">
  The wan2.5-i2i-preview model uses different API endpoints and parameter formats.

  ### Synchronous call (wan2.5)

  <Note>**Important** Make sure your DashScope Python SDK version is at least `1.25.2` and your DashScope Java SDK version is at least `2.22.2`.</Note>

  <CodeGroup>
    ```python
    import base64
    import mimetypes
    from http import HTTPStatus
    from urllib.parse import urlparse, unquote
    from pathlib import PurePosixPath

    import dashscope
    import requests
    from dashscope import ImageSynthesis
    import os

    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # If you have not configured an environment variable, replace the next line with: api_key="sk-xxx"
    api_key = os.getenv("DASHSCOPE_API_KEY")

    # --- Input image: Base64 encoding ---
    # Base64 format: data:{MIME_type};base64,{base64_data}
    def encode_file(file_path):
        mime_type, _ = mimetypes.guess_type(file_path)
        if not mime_type or not mime_type.startswith("image/"):
            raise ValueError("Unsupported or unrecognized image format")
        with open(file_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return f"data:{mime_type};base64,{encoded_string}"

    """
    Image input methods:
    Choose one of the following:

    1. Public URL — best for publicly accessible images
    2. Local file — best for local development and testing
    3. Base64 encoding — best for private images or secure transmission
    """

    # [Method 1] Public image URL
    image_url_1 = "https://img.alicdn.com/imgextra/i3/O1CN0157XGE51l6iL9441yX_!!6000000004770-49-tps-1104-1472.webp"
    image_url_2 = "https://img.alicdn.com/imgextra/i3/O1CN01SfG4J41UYn9WNt4X1_!!6000000002530-49-tps-1696-960.webp"

    # [Method 2] Local file (supports absolute and relative paths)
    # Format: file:// + file path
    # Example (absolute path):
    # image_url_1 = "file://" + "/path/to/your/image_1.png"     # Linux/macOS
    # image_url_2 = "file://" + "C:/path/to/your/image_2.png"  # Windows
    # Example (relative path):
    # image_url_1 = "file://" + "./image_1.png"                 # Adjust to your path
    # image_url_2 = "file://" + "./image_2.png"                # Adjust to your path

    # [Method 3] Base64-encoded image
    # image_url_1 = encode_file("./image_1.png")               # Adjust to your path
    # image_url_2 = encode_file("./image_2.png")              # Adjust to your path

    print('----sync call, please wait a moment----')
    rsp = ImageSynthesis.call(api_key=api_key,
                              model="wan2.5-i2i-preview",
                              prompt="Place the alarm clock from image 1 beside the vase on the dining table in image 2.",
                              images=[image_url_1, image_url_2],
                              negative_prompt="",
                              n=1,
                              # size="1280*1280",
                              prompt_extend=True,
                              watermark=False,
                              seed=12345)
    print('response: %s' % rsp)
    if rsp.status_code == HTTPStatus.OK:
        # Save images to current directory
        for result in rsp.output.results:
            file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
            with open('./%s' % file_name, 'wb+') as f:
                f.write(requests.get(result.url).content)
    else:
        print('sync_call Failed, status_code: %s, code: %s, message: %s' %
              (rsp.status_code, rsp.code, rsp.message))
    ```

    ```json
    {
        "status_code": 200,
        "request_id": "8ad45834-4321-44ed-adf5-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "3aff9ebd-35fc-4339-98a3-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [
                {
                    "url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx",
                    "orig_prompt": "Place the alarm clock from image 1 beside the vase on the dining table in image 2.",
                    "actual_prompt": "Place the blue alarm clock from image 1 to the right of the vase on the dining table in image 2, near the edge of the tablecloth. Keep the clock facing the camera and parallel to the tabletop, with natural shadow projection."
                }
            ],
            "submit_time": "2025-10-23 16:18:16.009",
            "scheduled_time": "2025-10-23 16:18:16.040",
            "end_time": "2025-10-23 16:19:09.591",
            "task_metrics": {
                "TOTAL": 1,
                "FAILED": 0,
                "SUCCEEDED": 1
            }
        },
        "usage": {
            "image_count": 1
        }
    }
    ```

    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.io.IOException;
    import java.nio.file.Files;
    import java.nio.file.Path;
    import java.nio.file.Paths;
    import java.util.*;

    public class Image2Image {

        static {
            Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // If you have not configured an environment variable, replace the next line with: apiKey="sk-xxx"
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        /**
         * Image input methods: choose one
         *
         * 1. Public URL — best for publicly accessible images
         * 2. Local file — best for local development and testing
         * 3. Base64 encoding — best for private images or secure transmission
         */

        // [Method 1] Public URL
        static String imageUrl_1 = "https://img.alicdn.com/imgextra/i3/O1CN0157XGE51l6iL9441yX_!!6000000004770-49-tps-1104-1472.webp";
        static String imageUrl_2 = "https://img.alicdn.com/imgextra/i3/O1CN01SfG4J41UYn9WNt4X1_!!6000000002530-49-tps-1696-960.webp";

        // [Method 2] Local file path (file://+absolute path or file:///+absolute path)
        // static String imageUrl_1 = "file://" + "/your/path/to/image_1.png";    // Linux/macOS
        // static String imageUrl_2 = "file:///" + "C:/your/path/to/image_2.png";  // Windows

        // [Method 3] Base64 encoding
        // static String imageUrl_1 = encodeFile("/your/path/to/image_1.png");
        // static String imageUrl_2 = encodeFile("/your/path/to/image_2.png");

        // List of images to edit
        static List<String> imageUrls = new ArrayList<>();
        static {
            imageUrls.add(imageUrl_1);
            imageUrls.add(imageUrl_2);
        }

        public static void syncCall() {
            // Set parameters
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("prompt_extend", true);
            parameters.put("watermark", false);
            parameters.put("seed", 12345);

            ImageSynthesisParam param =
                    ImageSynthesisParam.builder()
                            .apiKey(apiKey)
                            .model("wan2.5-i2i-preview")
                            .prompt("Place the alarm clock from image 1 beside the vase on the dining table in image 2.")
                            .images(imageUrls)
                            .n(1)
                             //.size("1280*1280")
                            .negativePrompt("")
                            .parameters(parameters)
                            .build();

            ImageSynthesis imageSynthesis = new ImageSynthesis();
            ImageSynthesisResult result = null;
            try {
                System.out.println("---sync call, please wait a moment----");
                result = imageSynthesis.call(param);
            } catch (ApiException | NoApiKeyException e){
                throw new RuntimeException(e.getMessage());
            }
            System.out.println(JsonUtils.toJson(result));
        }

        /**
         * Encode a file as a Base64 string
         * @param filePath File path
         * @return Base64 string in format data:{MIME_type};base64,{base64_data}
         */
        public static String encodeFile(String filePath) {
            Path path = Paths.get(filePath);
            if (!Files.exists(path)) {
                throw new IllegalArgumentException("File not found: " + filePath);
            }
            // Detect MIME type
            String mimeType = null;
            try {
                mimeType = Files.probeContentType(path);
            } catch (IOException e) {
                throw new IllegalArgumentException("Cannot detect file type: " + filePath);
            }
            if (mimeType == null || !mimeType.startsWith("image/")) {
                throw new IllegalArgumentException("Unsupported or unrecognized image format");
            }
            // Read file and encode
            byte[] fileBytes = null;
            try{
                fileBytes = Files.readAllBytes(path);
            } catch (IOException e) {
                throw new IllegalArgumentException("Cannot read file: " + filePath);
            }

            String encodedString = Base64.getEncoder().encodeToString(fileBytes);
            return "data:" + mimeType + ";base64," + encodedString;
        }

        public static void main(String[] args) {
            syncCall();
        }
    }
    ```

    ```json
    {
        "request_id": "d362685b-757f-4eac-bab5-xxxxxx",
        "output": {
            "task_id": "bfa7fc39-3d87-4fa7-b1e6-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [
                {
                    "orig_prompt": "Place the alarm clock from image 1 beside the vase on the dining table in image 2.",
                    "actual_prompt": "Place the blue alarm clock from image 1 to the right of the vase on the dining table in image 2, near the edge of the tablecloth. Keep the clock facing the camera and parallel to the vase.",
                    "url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx"
                }
            ],
            "task_metrics": {
                "TOTAL": 1,
                "SUCCEEDED": 1,
                "FAILED": 0
            }
        },
        "usage": {
            "image_count": 1
        }
    }
    ```
  </CodeGroup>

  ### Asynchronous call (wan2.5)

  <Note>**Important** Make sure your DashScope Python SDK version is at least `1.25.2` and your DashScope Java SDK version is at least `2.22.2`.</Note>

  <CodeGroup>
    ```python
    import os
    from http import HTTPStatus
    from urllib.parse import urlparse, unquote
    from pathlib import PurePosixPath
    import dashscope
    import requests
    from dashscope import ImageSynthesis

    dashscope.base_http_api_url = 'https://dashscope-intl.aliyuncs.com/api/v1'

    # If you have not configured an environment variable, replace the next line with: api_key="sk-xxx"
    api_key = os.getenv("DASHSCOPE_API_KEY")

    # Public image URLs
    image_url_1 = "https://img.alicdn.com/imgextra/i3/O1CN0157XGE51l6iL9441yX_!!6000000004770-49-tps-1104-1472.webp"
    image_url_2 = "https://img.alicdn.com/imgextra/i3/O1CN01SfG4J41UYn9WNt4X1_!!6000000002530-49-tps-1696-960.webp"

    def async_call():
        print('----create task----')
        task_info = create_async_task()
        print('----wait task----')
        wait_async_task(task_info)

    # Create an asynchronous task
    def create_async_task():
        rsp = ImageSynthesis.async_call(api_key=api_key,
                                        model="wan2.5-i2i-preview",
                                        prompt="Place the alarm clock from image 1 beside the vase on the dining table in image 2.",
                                        images=[image_url_1, image_url_2],
                                        negative_prompt="",
                                        n=1,
                                        # size="1280*1280",
                                        prompt_extend=True,
                                        watermark=False,
                                        seed=12345)
        print(rsp)
        if rsp.status_code == HTTPStatus.OK:
            print(rsp.output)
        else:
            print('Failed, status_code: %s, code: %s, message: %s' %
                  (rsp.status_code, rsp.code, rsp.message))
        return rsp

    # Wait for the asynchronous task to finish
    def wait_async_task(task):
        rsp = ImageSynthesis.wait(task=task, api_key=api_key)
        print(rsp)
        if rsp.status_code == HTTPStatus.OK:
            print(rsp.output)
            # Save file to current directory
            for result in rsp.output.results:
                file_name = PurePosixPath(unquote(urlparse(result.url).path)).parts[-1]
                with open('./%s' % file_name, 'wb+') as f:
                    f.write(requests.get(result.url).content)
        else:
            print('Failed, status_code: %s, code: %s, message: %s' %
                  (rsp.status_code, rsp.code, rsp.message))

    # Fetch asynchronous task status
    def fetch_task_status(task):
        status = ImageSynthesis.fetch(task=task, api_key=api_key)
        print(status)
        if status.status_code == HTTPStatus.OK:
            print(status.output.task_status)
        else:
            print('Failed, status_code: %s, code: %s, message: %s' %
                  (status.status_code, status.code, status.message))

    # Cancel an asynchronous task. Only PENDING tasks can be canceled.
    def cancel_task(task):
        rsp = ImageSynthesis.cancel(task=task, api_key=api_key)
        print(rsp)
        if rsp.status_code == HTTPStatus.OK:
            print(rsp.output.task_status)
        else:
            print('Failed, status_code: %s, code: %s, message: %s' %
                  (rsp.status_code, rsp.code, rsp.message))

    if __name__ == '__main__':
        async_call()
    ```

    ```json
    {
        "status_code": 200,
        "request_id": "31b04171-011c-96bd-ac00-f0383b669cc7",
        "code": "",
        "message": "",
        "output": {
            "task_id": "4f90cf14-a34e-4eae-xxxxxxxx",
            "task_status": "PENDING",
            "results": []
        },
        "usage": null
    }
    ```

    ```json
    {
        "status_code": 200,
        "request_id": "8ad45834-4321-44ed-adf5-xxxxxx",
        "code": null,
        "message": "",
        "output": {
            "task_id": "3aff9ebd-35fc-4339-98a3-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [
                {
                    "url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx",
                    "orig_prompt": "Place the alarm clock from image 1 beside the vase on the dining table in image 2.",
                    "actual_prompt": "Place the blue alarm clock from image 1 to the right of the vase on the dining table in image 2, near the edge of the tablecloth. Keep the clock facing the camera and parallel to the tabletop, with natural shadow projection."
                }
            ],
            "submit_time": "2025-10-23 16:18:16.009",
            "scheduled_time": "2025-10-23 16:18:16.040",
            "end_time": "2025-10-23 16:19:09.591",
            "task_metrics": {
                "TOTAL": 1,
                "FAILED": 0,
                "SUCCEEDED": 1
            }
        },
        "usage": {
            "image_count": 1
        }
    }
    ```

    ```java
    // Copyright (c) Alibaba, Inc. and its affiliates.

    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesis;
    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisListResult;
    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisParam;
    import com.alibaba.dashscope.aigc.imagesynthesis.ImageSynthesisResult;
    import com.alibaba.dashscope.exception.ApiException;
    import com.alibaba.dashscope.exception.NoApiKeyException;
    import com.alibaba.dashscope.task.AsyncTaskListParam;
    import com.alibaba.dashscope.utils.Constants;
    import com.alibaba.dashscope.utils.JsonUtils;

    import java.util.ArrayList;
    import java.util.HashMap;
    import java.util.List;
    import java.util.Map;

    public class Image2Image {

        static {
            Constants.baseHttpApiUrl = "https://dashscope-intl.aliyuncs.com/api/v1";
        }

        // If you have not configured an environment variable, replace the next line with: apiKey="sk-xxx"
        static String apiKey = System.getenv("DASHSCOPE_API_KEY");

        // Public URLs
        static String imageUrl_1 = "https://img.alicdn.com/imgextra/i3/O1CN0157XGE51l6iL9441yX_!!6000000004770-49-tps-1104-1472.webp";
        static String imageUrl_2 = "https://img.alicdn.com/imgextra/i3/O1CN01SfG4J41UYn9WNt4X1_!!6000000002530-49-tps-1696-960.webp";

        // List of images to edit
        static List<String> imageUrls = new ArrayList<>();
        static {
            imageUrls.add(imageUrl_1);
            imageUrls.add(imageUrl_2);
        }

        public static void asyncCall() {
            // Set parameters
            Map<String, Object> parameters = new HashMap<>();
            parameters.put("prompt_extend", true);
            parameters.put("watermark", false);
            parameters.put("seed", 12345);

            ImageSynthesisParam param =
                    ImageSynthesisParam.builder()
                            .apiKey(apiKey)
                            .model("wan2.5-i2i-preview")
                            .prompt("Place the alarm clock from image 1 beside the vase on the dining table in image 2.")
                            .images(imageUrls)
                            .n(1)
                            //.size("1280*1280")
                            .negativePrompt("")
                            .parameters(parameters)
                            .build();
            ImageSynthesis imageSynthesis = new ImageSynthesis();
            ImageSynthesisResult result = null;
            try {
                System.out.println("---async call, please wait a moment----");
                result = imageSynthesis.asyncCall(param);
            } catch (ApiException | NoApiKeyException e){
                throw new RuntimeException(e.getMessage());
            }

            System.out.println(JsonUtils.toJson(result));

            String taskId = result.getOutput().getTaskId();

            System.out.println("taskId=" + taskId);

            try {
                result = imageSynthesis.wait(taskId, apiKey);
            } catch (ApiException | NoApiKeyException e){
                throw new RuntimeException(e.getMessage());
            }
            System.out.println(JsonUtils.toJson(result));
            System.out.println(JsonUtils.toJson(result.getOutput()));
        }

        public static void listTask() throws ApiException, NoApiKeyException {
            ImageSynthesis is = new ImageSynthesis();
            AsyncTaskListParam param = AsyncTaskListParam.builder().build();
            param.setApiKey(apiKey);
            ImageSynthesisListResult result = is.list(param);
            System.out.println(result);
        }

        public void fetchTask(String taskId) throws ApiException, NoApiKeyException {
            ImageSynthesis is = new ImageSynthesis();
            // If DASHSCOPE_API_KEY is set as an environment variable, apiKey can be empty.
            ImageSynthesisResult result = is.fetch(taskId, apiKey);
            System.out.println(result.getOutput());
            System.out.println(result.getUsage());
        }

        public static void main(String[] args) {
            asyncCall();
        }
    }
    ```

    ```json
    {
        "request_id": "5dbf9dc5-4f4c-9605-85ea-542f97709ba8",
        "output": {
            "task_id": "7277e20e-aa01-4709-xxxxxxxx",
            "task_status": "PENDING"
        }
    }
    ```

    ```json
    {
        "request_id": "d362685b-757f-4eac-bab5-xxxxxx",
        "output": {
            "task_id": "bfa7fc39-3d87-4fa7-b1e6-xxxxxx",
            "task_status": "SUCCEEDED",
            "results": [
                {
                    "orig_prompt": "Place the alarm clock from image 1 beside the vase on the dining table in image 2.",
                    "actual_prompt": "Place the blue alarm clock from image 1 to the right of the vase on the dining table in image 2, near the edge of the tablecloth. Keep the clock facing the camera and parallel to the vase.",
                    "url": "https://dashscope-result-sh.oss-cn-shanghai.aliyuncs.com/xxx.png?Expires=xxx"
                }
            ],
            "task_metrics": {
                "TOTAL": 1,
                "SUCCEEDED": 1,
                "FAILED": 0
            }
        },
        "usage": {
            "image_count": 1
        }
    }
    ```
  </CodeGroup>
</Accordion>

## Demonstration

### Generate Image Groups

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "40%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "60%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="Wan_图片生成_一位 20 岁的东亚男性，头发是卷卷的半长发，文艺气质，五官立体，眉眼清秀，穿着简约白色 T 恤或浅蓝色衬衫，少年感，自然气质。-2026-03-31-19-26-24" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1064359.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="output" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1064360.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "33%"}}>
        <img alt="wan_image_reqid_57d7a71c-1932-4de8-8c32-be0f3fd5696f_n1-2026-03-31-19-32-44" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1064362.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top", width: "67%"}}>
        <img alt="output" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1064361.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Interactive Editing

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="Interactive editing input" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1064357.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="Interactive editing output" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/8163205771/p1064358.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "71%"}}>
        <img alt="5eecdaf48460cde5f7fd58249809b192a118accde85283f275b8339e1c4c24831b75b38faadcd24bec177c308ebd5304463ca8e345548eb5f551b6ba01cd2c8d2d9b5606fa569ff7ba4077816ac9b801464f65aedbcf494f4fb4c8ed7016461c-combine" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/8163205771/p1064355.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top", width: "29%"}}>
        <img alt="5eecdaf48460cde5f7fd58249809b192a118accde85283f275b8339e1c4c24831b75b38faadcd24bec177c308ebd530460436714d0283cee289325430893028097a53a8e5d630fb1c2d4c85d8cbb68a4387575c4b03700344fb4c8ed7016461c-2026-03-31-19-13-38" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1064356.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Multi-Image Fusion

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "69%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "31%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304e9d05d028a65a9ac270ee730e44b8c75c6634a9b9a7a70240d438b02b2f2153dc68966b442378d1d4fb4c8ed7016461c-combine" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039962.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd53044b9a1d72dee2f8507ee704b9cef3832907ff1182f52507c9bc4737520762d46a722e658f57cda6524fb4c8ed7016461c-2025-12-29-19-11-31" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039963.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "75%"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304f060ec7a363e318af9bfaaa5e07be972cfc1ea4e21b47637fcdb2dfc53130c40a8efed5defc408a04fb4c8ed7016461c-combine" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039968.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top", width: "25%"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304922cbdef3e3c42f83239de6d0f35a8b76f0e38934cc5170f7a908ec12140fb0af6590c72bcf1ba6f4fb4c8ed7016461c-2025-12-29-19-15-53" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039971.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Subject Feature Preservation

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd53043e6c778a593da070988fa11b14a85d95e1c17d91f51ae21f2f94f7e5f5f32208a0ad2896cb2b0a024fb4c8ed7016461c-2025-12-29-20-00-22" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040014.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304c29923066754bb698349034eb20df1ce0b5ae32ae31d57bb753bd259e87d69dd01cab9fe9f470e1a4fb4c8ed7016461c-2025-12-29-20-00-21" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040015.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>

    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304448a972b9f2ee7a7aadcc61495f4975a049f009e7721cbc833dc3a8005b1b026a54eaaec109d73484fb4c8ed7016461c-2025-12-29-20-00-21" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/8163205771/p1040012.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304cc1b4a509823c5fb5e60999898811f8b51d7419220a118c9ff82110bc9525725a9ad7338f75985794fb4c8ed7016461c-2025-12-29-20-00-21" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040013.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Detection and Segmentation

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304b025e74206dc2cec5c2e587c3fe6fb135293836c9479220355470da15476dc934b26018061e9db0b4fb4c8ed7016461c-2025-12-29-19-54-33" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040006.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd530451385eb561b49b0fe1f2169526b6a7e15bd78940def3c640c801511c349f6df35dceb72f4d3755f94fb4c8ed7016461c-2025-12-29-19-54-33" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040007.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>

    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd530440256f9add4113787af5d4f3a55469b38ef2422f018076640eb7cb552584c02ee729fcb23fec3bca4fb4c8ed7016461c-2025-12-29-19-54-33" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040008.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304f0612d67f5c810ebef958385624ebd17323047aa5d00465d0e35257de5a2ea49d4b375d2e57693fa4fb4c8ed7016461c-2025-12-29-19-54-32" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040009.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Extract Elements

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "33%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "67%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd53046b83761f1ab18c40e144f5db2b388e5f865ba9a5961d98b2710ce177c6a0f4baff63fe52259c44364fb4c8ed7016461c-2025-12-29-19-48-27" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040000.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd53048e2a0d1d2805d92ba8d45a3bd1368528dd76f517b21ad1f545eb4097610838497cbdb5196da94ff54fb4c8ed7016461c-2025-12-29-19-48-27" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1040001.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Text Editing

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd530490f493eca22f34f0197173ddfdef17a04b34cb94813178b9d4eee36d246d3530a3e2fc6258cca0694fb4c8ed7016461c-2025-12-29-19-28-35" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/8163205771/p1039976.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304fe77776567f4ef79cb621289a6fdaa981f3364fe4c7c56265403b5d9d5ac43eaf5931f62db14952f4fb4c8ed7016461c-2025-12-29-19-28-35" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039977.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>

    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd530476e971380812b1b9dbeac68272a27057175499fe84f0781c7b6fa6535f438c67f3556acc8c7324394fb4c8ed7016461c-2025-12-29-19-28-35" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039978.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd53047be52c6f41edecdefa77f0d93335d1492f1821b47dff7a1b08f60e99bdafcc84c31e3658fc593c904fb4c8ed7016461c-2025-12-29-19-28-35" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039979.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>

    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304fdb284f8d5c8ead814d11890da1a49411a6d9d41ad1bb2a4bf0b93d0bee5d792e8f5b419a3da9d534fb4c8ed7016461c-2025-12-29-19-28-34" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039980.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304df1c8787530497f4cc3bee0b84d3ba51d0353fceb8d0518ded6a25e8c0ddfec714f719154ac1c9354fb4c8ed7016461c-2025-12-29-19-28-34" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039981.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Lens and Viewpoint Editing

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Input Image</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px"}}>Output Image</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="image (2)-2025-12-29-19-42-44" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039991.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="image (3)-2025-12-29-19-42-44" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039992.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>

    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd5304a53988b2efdd2fb6b95cb3b1b02701e6ff2c4902170b1ee230a9b4e3726a891c93646d68b821de294fb4c8ed7016461c-2025-12-29-19-42-43" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/9163205771/p1039995.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="5eecdaf48460cde5544f9fac410016bc2fe4c1b4d23666c075b8339e1c4c24831b75b38faadcd24bec177c308ebd530428783dee341e41eb06234dfb75bd149d774f4850000123559a98bcd7ece97dc4a6c3cefa983ae8ac4fb4c8ed7016461c-2025-12-29-19-42-43" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/8163205771/p1039996.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

## Input instructions

### Input image specifications

| **Specification**      | **wan2.7-image-pro, wan2.7-image**                      | **wan2.6-image**                                        | **wan2.5-i2i-preview**                                  |
| ---------------------- | ------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------- |
| Number of input images | 0 to 9 (0 for text-to-image mode)                       | Image editing: 1 to 4 / Mixed media: 0 to 1             | 1 to 3                                                  |
| Image format           | JPEG, JPG, PNG (alpha channel not supported), BMP, WEBP | JPEG, JPG, PNG (alpha channel not supported), BMP, WEBP | JPEG, JPG, PNG (alpha channel not supported), BMP, WEBP |
| Image dimensions       | \[240, 8000] pixels                                     | \[240, 8000] pixels                                     | \[384, 5000] pixels                                     |
| File size              | ≤ 20 MB                                                 | ≤ 10 MB                                                 | ≤ 10 MB                                                 |
| Aspect ratio           | \[1:8, 8:1]                                             | No limit                                                | \[1:4, 4:1]                                             |

### Image input order

<table style={{width: "100%", borderCollapse: "separate", borderSpacing: "8px 0", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "27%", paddingBottom: "8px"}}>**Input image 1**</th>
      <th style={{textAlign: "left", width: "20%", paddingBottom: "8px"}}>**Input image 2**</th>
      <th style={{textAlign: "left", width: "27%", paddingBottom: "8px"}}>**Output image**</th>

      <th style={{textAlign: "left", width: "27%", paddingBottom: "8px"}} />
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top"}}>
        <img alt="image (19)-转换自-png" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/3509593671/p1025838.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />

        Image 1
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="image (20)-转换自-png" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/3509593671/p1025839.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />

        Image 2
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="04e0fc39-7ad6-41e0-9df9-1f69ac3ce825-转换自-png" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/3509593671/p1021092.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />

        Prompt: Move Image 1 onto Image 2
      </td>

      <td style={{verticalAlign: "top"}}>
        <img alt="36ed450d-bd54-4169-b13f-3d0f26d9d360-转换自-png" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/3509593671/p1021093.webp" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />

        Prompt: Move Image 2 onto Image 1
      </td>
    </tr>
  </tbody>
</table>

### Methods for providing images

Provide images in the following ways:

<Accordion title="Method 1: Public URL">
  ```python
  # Use a publicly accessible image URL
  image_url = "https://example.com/your-image.png"
  ```

  ```bash
  # In curl, pass the URL directly in the JSON body
  "image": "https://example.com/your-image.png"
  ```
</Accordion>

<Accordion title="Method 2: Base64 encoding">
  ```python
  import os
  import base64
  import mimetypes

  # The format is data:{mime_type};base64,{base64_data}
  def encode_file(file_path):
      mime_type, _ = mimetypes.guess_type(file_path)
      with open(file_path, "rb") as image_file:
          encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
      return f"data:{mime_type};base64,{encoded_string}"


  # Call the encoding function. Replace "/path/to/your/image.png" with the path to your local image file. Otherwise, the code will not run.
  image = encode_file("/path/to/your/image.png")
  ```
</Accordion>

<Accordion title="Method 3: Local file path (SDK only)">
  ```python
  # Local file path format: file:// + absolute path
  # Linux/macOS example:
  image_url = "file://" + "/path/to/your/image.png"
  # Windows example:
  image_url = "file:///" + "C:/path/to/your/image.png"

  # Relative path example:
  image_url = "file://" + "./your-image.png"
  ```

  This method is only supported by the SDK. Curl requests require a public URL or Base64 encoding.
</Accordion>

## Key capabilities

### 1. Instruction following (prompts)

The parameters are `messages.content.text` or `input.prompt` (required), and `negative_prompt` (optional).

| **Parameter**    | **wan2.7-image-pro, wan2.7-image** | **wan2.6-image**                | **wan2.5-i2i-preview**          |
| ---------------- | ---------------------------------- | ------------------------------- | ------------------------------- |
| text             | Required, up to 5000 characters    | Required, up to 2000 characters | Not supported                   |
| prompt           | Not supported                      | Not supported                   | Required, up to 2000 characters |
| negative\_prompt | Not supported                      | Supported, up to 500 characters | Supported, up to 500 characters |

### 2. Enable prompt rewriting

The parameter is `parameters.prompt_extend` (bool, **default true** ).

This feature automatically expands and optimizes short prompts to improve output image quality. However, enabling it adds extra processing time.

| **Parameter**  | **wan2.7-image-pro, wan2.7-image** | **wan2.6-image**           | **wan2.5-i2i-preview** |
| -------------- | ---------------------------------- | -------------------------- | ---------------------- |
| prompt\_extend | Not supported                      | Supported (edit mode only) | Supported              |

### 3. Set output image resolution

The parameter is `parameters.size` (string), formatted as `"width*height"` .

| **Parameter** | **wan2.7-image-pro, wan2.7-image**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | **wan2.6-image**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | **wan2.5-i2i-preview**                                                                                                                                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| size          | **Option 1: Specify output resolution (recommended)** In edit mode (at least one input image provided), choose from these resolution presets: `1K` , `2K` (default). `1K` : Output has approximately 1024×1024 total pixels, preserving the aspect ratio of the last input image. `2K` : Output has approximately 2048×2048 total pixels, preserving the aspect ratio of the last input image. **Option 2: Specify exact width and height in pixels** Total pixels must be between 768×768 and 2048×2048, with an aspect ratio between 1:8 and 8:1. Only wan2.7-image-pro in text-to-image scenarios supports 4K resolution. | **Option 1: Match input image aspect ratio (recommended)** In edit mode ( `enable_interleave=false` ), choose from these resolution presets: `1K` (default), `2K` . `1K` : Output has approximately 1280×1280 total pixels, preserving the aspect ratio of the last input image. `2K` : Output has approximately 2048×2048 total pixels, preserving the aspect ratio of the last input image. **Option 2: Specify exact width and height in pixels** Total pixels must be between 768×768 and 2048×2048, with an aspect ratio between 1:4 and 4:1. The pixel value of the actual output image is a multiple of 16 that is closest to the specified value. | **Only exact width and height in pixels are supported** Total pixels must be between 768×768 and 1280×1280, with an aspect ratio between 1:4 and 4:1. If you do not specify `size` , the system generates an image with a total of `1280*1280` pixels by default, with the same aspect ratio as the last input image. |

### 4. Interactive precise editing

You can use the `parameters.bbox_list` parameter to define interactive editing regions. The format is `List[List[List[int]]]` . This lets you select specific objects or areas in the image for more accurate edits. **Only wan2.7-image-pro and wan2.7-image support this feature.**

For example, if the input includes 3 images, and Image 2 has no selections while Image 1 has two selections, you would use the following:

```python
[
  [[0, 0, 12, 12], [25, 25, 100, 100]],  # Image 1 (2 boxes)
  [],                                    # Image 2 (no boxes)
  [[10, 10, 50, 50]]                    # Image 3 (1 box)
]
```

## Billing and Rate Limits

- For free quota and pricing details, see [Pricing](/developer-guides/getting-started/pricing).

- For rate limit details, see [Rate Limits](/developer-guides/administration/rate-limits).

- Billing details: You are billed for each **successfully generated image**. Charges are incurred only when the API returns a `task_status` of `SUCCEEDED` and an image is generated. You are not charged for failed calls or processing errors, and they do not consume your [free quota](/resources/free-quota).

## API Reference

For information about input and output parameters, see [Wan - Image Generation and Editing](/api-reference/image-generation/wan27-image-gen-edit/create-task) (for wan2.7-image and wan2.6-image) and [Wan - General Image Editing 2.5 API Reference](/api-reference/image-generation/wan25-general-image-editing/create-task).
