> ## Documentation Index
> Fetch the complete documentation index at: https://docs.qwencloud.com/llms.txt
> Use this file to discover all available pages before exploring further.

# Text-to-image

> Better Wan image results

Write effective prompts to generate high-quality images with the [Text-to-image guide](/developer-guides/image-generation/text-to-image). This guide covers prompt structure, visual vocabulary, and practical examples so you can consistently get the results you want.

## Prompt structure

The more complete and precise your prompt, the higher the quality of the generated image. Here are two prompt formulas for different requirements.

### Basic formula

**Target users**: New users trying AI creation for the first time, and users using AI as a source of inspiration. Use this formula for quick exploration and creative experimentation.

**Prompt = Subject + Setting + Style**

| Element     | What it controls                                                     | Examples                                    |
| ----------- | -------------------------------------------------------------------- | ------------------------------------------- |
| **Subject** | Main object -- person, animal, plant, object, or imaginary creature  | "a golden retriever", "a medieval castle"   |
| **Setting** | Where the subject is -- indoor/outdoor, season, weather, time of day | "in a snowy forest", "at sunset on a beach" |
| **Style**   | Artistic look -- realistic, abstract, painterly                      | "watercolor style", "cinematic photography" |

**Example**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingRight: "12px"}}>Prompt</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingLeft: "12px"}}>Result</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top", paddingRight: "12px"}}>
        25-year-old Chinese girl, round face, looking at the camera, elegant ethnic costume, <strong>commercial photography</strong>, <strong>outdoor</strong>, <strong>cinematic lighting</strong>, <strong>half-body close-up</strong>, delicate light makeup, sharp edges.
      </td>

      <td style={{verticalAlign: "top", paddingLeft: "12px"}}>
        <img alt="Basic formula example" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902465.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Advanced formula

**Target users**: Users with some experience in AI image generation. Use this formula when you want fine-grained control over camera, mood, and detail.

**Prompt = Subject + Setting + Style + Camera + Atmosphere + Detail modifiers**

| Element              | What it controls                                      | Examples                                                |
| -------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| **Subject**          | Main object with specific characteristics and actions | "a cute 10-year-old Chinese girl wearing a red dress"   |
| **Setting**          | Detailed environmental characteristics                | "surrounded by animal kingdom city street shops"        |
| **Style**            | Specific artistic style or visual technique           | "watercolor style", "Pixar style", "felt style"         |
| **Camera**           | Shot size, angle, lens type, and composition          | "close-up", "centered composition", "photographic lens" |
| **Atmosphere**       | Mood and emotional tone                               | "dreamy", "lonely", "majestic", "childlike wonder"      |
| **Detail modifiers** | Refinements for quality and aesthetics                | "4K", "high resolution", "backlight", "natural"         |

**Example**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <thead>
    <tr>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingRight: "12px"}}>Prompt</th>
      <th style={{textAlign: "left", width: "50%", paddingBottom: "8px", paddingLeft: "12px"}}>Result</th>
    </tr>
  </thead>

  <tbody>
    <tr>
      <td style={{verticalAlign: "top", paddingRight: "12px"}}>
        <strong>A panda made of wool felt</strong>, wearing a wide-brimmed hat, dressed in a blue police uniform vest, with a belt around the waist, carrying police equipment, wearing blue gloves, leather shoes, in a running posture, felt effect, <strong>surrounded by animal kingdom city street shops</strong>, premium filter, street lamps, animal kingdom, childlike wonder, adorable appearance, night, bright, natural, cute, 4K, felt material, <strong>photographic lens</strong>, centered composition, <strong>felt style</strong>, <strong>Pixar style</strong>, <strong>backlight</strong>.
      </td>

      <td style={{verticalAlign: "top", paddingLeft: "12px"}}>
        <img alt="Advanced formula example" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902591.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Structured prompt template

For maximum control, use the following dimensions as a checklist. Include only those relevant to your image.

| Dimension        | Description               | Example values                                 |
| ---------------- | ------------------------- | ---------------------------------------------- |
| **Subject**      | Main focus of the image   | "a cheetah", "an old lighthouse"               |
| **Action/Pose**  | What the subject is doing | "running", "looking at the camera"             |
| **Style**        | Artistic approach         | "3D cartoon", "ink painting", "realistic"      |
| **Setting**      | Background environment    | "dense forest", "city street at night"         |
| **Lighting**     | Light source and quality  | "cinematic lighting", "backlight", "neon"      |
| **Atmosphere**   | Mood or emotion           | "serene", "dramatic", "whimsical"              |
| **Camera angle** | Viewing perspective       | "eye level", "bird's eye", "low angle"         |
| **Shot size**    | Subject framing           | "extreme close-up", "medium shot", "long shot" |
| **Lens**         | Lens simulation           | "macro", "telephoto", "fisheye"                |

## Prompt parameters

Text-to-image V2 prompt-related parameters:

| Parameter         | Location                          | Description                                                                                                                                                     |
| ----------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `text`            | `input.messages[].content[].text` | Positive prompt that describes the image to generate. Supports both Chinese and English.                                                                        |
| `negative_prompt` | `parameters.negative_prompt`      | Negative prompt that specifies content to exclude from the image.                                                                                               |
| `prompt_extend`   | `parameters.prompt_extend`        | Specifies whether to enable intelligent prompt rewriting. Defaults to `true`, which enables intelligent rewriting by an LLM. Keep the default for best results. |

**Example request**

```json
{
  "model": "wan2.6-t2i",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "text": "A flower shop with exquisite windows, beautiful wooden doors, and flowers on display"
          }
        ]
      }
    ]
  },
  "parameters": {
    "negative_prompt": "people",
    "prompt_extend": true
  }
}
```

## Prompt vocabulary reference

The following sections provide ready-to-use keywords for five visual dimensions: shot size, perspective, lens type, style, and lighting. Add any keyword directly to your prompt.

### Shot size

Shot size controls how much of the subject fills the frame. It is generally divided into long shot, full shot, medium shot, close-up, and extreme close-up.

| Shot type            | When to use                                  | Prompt keyword     |
| -------------------- | -------------------------------------------- | ------------------ |
| **Extreme close-up** | Highlight facial details, textures, emotions | `extreme close-up` |
| **Close-up**         | Focus on a single subject with some context  | `close-up`         |
| **Medium shot**      | Balance subject and environment              | `medium shot`      |
| **Long shot**        | Emphasize environment, show scale            | `long shot`        |

**Examples**

**Extreme close-up**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        High-definition camera, emotional photography, sunset, extreme close-up portrait.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Extreme close-up" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902496.jpeg" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Close-up**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        18-year-old Chinese girl, ancient costume, round face, looking at the camera, elegant ethnic costume, commercial photography, outdoor, cinematic lighting, half-body close-up, delicate light makeup, sharp edges.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Close-up" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902497.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Medium shot**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Cinematic fashion glamour photography, young Asian woman, Chinese Miao girl, round face, looking at the camera, elegant dark ethnic costume, medium wide-angle lens, sunny, utopian, shot with a high-definition camera.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Medium shot" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902498.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Long shot**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows two small figures standing on a distant mountaintop against a magnificent snowy mountain background, with their backs to the camera, quietly admiring the sunset. The sunset's glow bathes the snow-capped mountains in a golden light, creating a stark contrast with the azure sky. The two people seem captivated by this spectacular natural scene, and the entire image is filled with tranquility and harmony.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Long shot" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902495.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Perspective

Perspective controls the camera angle relative to the subject.

| Perspective type | When to use                            | Prompt keyword           |
| ---------------- | -------------------------------------- | ------------------------ |
| **Eye level**    | Natural, relatable viewpoint           | `eye level perspective`  |
| **Bird's eye**   | Overview, patterns, scale from above   | `bird's eye perspective` |
| **Low angle**    | Dramatic, imposing, powerful subjects  | `low angle`              |
| **Aerial**       | Landscape overview, geographic context | `aerial perspective`     |

**Examples**

**Eye level**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        The image shows a grassland scene captured from an eye level perspective, where a flock of sheep leisurely graze on the lush green grass, their wool glowing with a warm golden hue in the weak morning sunlight, creating beautiful light and shadow effects.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Eye level" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902548.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Bird's eye**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        The scene depicts a view looking down at the ice lake from the air, with a small boat in the center, surrounded by vortex patterns and vibrant blue seawater. Spiral abyss, the scene is shot from above in a top-down perspective, showing intricate details such as ripples on the surface and layers beneath the snow-covered ground. Gazing out at the cold vast expanse. Creating an awe-inspiring sense of tranquility.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Bird's eye" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902550.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Low angle**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows a spectacular scene in a tropical area, where tall coconut trees stand like towering giants, with lush branches pointing towards the blue sky. The camera uses a low angle perspective, making viewers feel as if they are standing under the trees, experiencing the majesty and vitality of nature. Sunlight filters through the gaps in the leaves, creating dappled light and shadow, adding a touch of mystery and romance. The entire image is filled with tropical flavor, making one almost smell the coconut fragrance and feel the pleasant breeze on their face.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Low angle" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902549.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Aerial**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows heavy snow, village, roads, lights, trees. Aerial perspective, realistic effect.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Aerial" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902547.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Lens type

Lens type simulates different camera lenses and their optical characteristics.

| Lens type            | When to use                                   | Prompt keyword          |
| -------------------- | --------------------------------------------- | ----------------------- |
| **Macro**            | Tiny details, textures, small objects         | `macro lens`            |
| **Ultra-wide angle** | Expansive landscapes, architectural interiors | `ultra-wide angle lens` |
| **Telephoto**        | Isolated subjects with blurred backgrounds    | `telephoto lens`        |
| **Fisheye**          | Exaggerated distortion, creative effects      | `fisheye lens`          |

**Examples**

**Macro**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Cherries, carbonated water, macro, professional color grading, clean sharp focus, commercial high quality, magazine winning photography, hyper realistic, uhd, 8K.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Macro" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902553.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Ultra-wide angle**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Island under blue sea and sky, sunlight filtering through tree leaves, casting dappled shadows. Ultra-wide angle lens.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Ultra-wide angle" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902556.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Telephoto**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows a cheetah standing in a lush forest under a telephoto lens, facing the camera, with the background cleverly blurred, making the cheetah's face the absolute focus of the image. Sunlight filters through the gaps in the leaves, creating dappled light and shadow effects on the cheetah, enhancing the visual impact.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Telephoto" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902555.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Fisheye**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows a scene where a woman stands and looks directly at the camera under the special perspective of a fisheye lens. Her image is exaggeratedly enlarged in the center of the frame, while the surroundings show strong distortion effects, creating a unique visual impact.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Fisheye" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902554.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Style

Style defines the artistic look and rendering technique applied to the image.

| Style                | When to use                              | Prompt keyword           |
| -------------------- | ---------------------------------------- | ------------------------ |
| **3D cartoon**       | Animated characters, playful scenes      | `3D cartoon style`       |
| **Post-apocalyptic** | Dystopian, ruined environments           | `post-apocalyptic style` |
| **Pointillism**      | Impressionist dots, textured appearance  | `pointillism`            |
| **Surrealism**       | Dreamlike, impossible scenes             | `surrealist style`       |
| **Watercolor**       | Soft, painterly, translucent effects     | `watercolor`             |
| **Clay**             | Sculpted, tactile, handmade look         | `clay style`             |
| **Realistic**        | Photographic realism, lifelike detail    | `realistic`              |
| **Ceramic**          | Glazed, sculpted, porcelain-like         | `ceramic`                |
| **3D**               | Rendered, dimensional, CGI look          | `3D`, `C4D rendering`    |
| **Ink painting**     | Traditional East Asian brush art         | `ink painting`           |
| **Origami**          | Paper-folded, geometric, minimal         | `origami`                |
| **Gongbi**           | Fine-detail traditional Chinese painting | `Gongbi painting`        |
| **Chinese ink**      | Ink wash with Chinese aesthetic          | `Chinese ink style`      |

**Examples**

**3D cartoon**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Female tennis player, short hair, white tennis outfit, black shorts, returning the ball from the side, 3D cartoon style.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="3D cartoon" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902559.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Post-apocalyptic**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        City on Mars, post-apocalyptic style.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Post-apocalyptic" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902561.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Pointillism**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        A cute white little house, thatched roof, a snow-covered prairie, bold use of pointillism, Monet feel, clear brushstrokes, blurred edges, primitive edge texture, low saturation colors, low contrast, Morandi colors.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Pointillism" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902564.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Surrealism**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        A pink glowing river in a deep gray sea, with a minimalist, beautiful, and aesthetic atmosphere, cinematic lighting with a surrealist style.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Surrealism" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902562.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Watercolor**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Light watercolor, outside a cafe, bright white background, fewer details, dreamy, Studio Ghibli.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Watercolor" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902563.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Clay**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Clay style, little boy in a blue sweater, brown curly hair, dark blue beret, drawing board, outdoors, seaside, half-body shot.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Clay" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902560.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Realistic**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Basket, grapes, picnic cloth, hyper realistic still life photography, macro lens, Tyndall effect.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Realistic" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902570.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Ceramic**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows a highly detailed ceramic dog lying quietly on a table with a delicate bell tied around its neck. Each strand of the dog's fur is intricately carved, and the details of its eyes, nose, and mouth are lifelike.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Ceramic" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902568.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**3D**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Chinese dragon, cute Chinese dragon sleeping on white clouds, charming garden, in morning mist, close-up, front view, 3D, C4D rendering, 32k ultra high definition, 32k UHD, Chinese punk, 32k UHD, animal statue, octane rendering, ultra high definition.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="3D" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902567.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Ink painting**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Orchid, ink painting, white space, artistic conception, Wu Guanzhong style, delicate brushstrokes, texture of rice paper.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Ink painting" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902565.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Origami**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Origami masterpiece, kraft paper panda, forest background, medium shot, minimalism, backlight, best quality.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Origami" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902566.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Gongbi**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        At dawn, a plum blossom stands proudly in the snow, with petals as delicate as silk, dewdrops lightly hanging, showcasing the exquisite beauty of Gongbi painting.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Gongbi" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902571.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Chinese ink**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Chinese ink style, a man with long black hair, golden hairpin, golden butterflies flying around, white clothing, high detail, high quality, deep blue background, with faintly visible ink bamboo forest in the background.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Chinese ink" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902569.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

### Lighting

Lighting sets the mood, atmosphere, and visual depth of the image.

| Lighting type     | When to use                                  | Prompt keyword                       |
| ----------------- | -------------------------------------------- | ------------------------------------ |
| **Natural light** | Outdoor scenes, realistic warmth             | `sunlight`, `moonlight`, `starlight` |
| **Backlight**     | Silhouettes, halo effects, dramatic contours | `backlight`                          |
| **Neon light**    | Urban night scenes, cyberpunk aesthetics     | `neon light`                         |
| **Ambient light** | Soft, diffused, atmospheric glow             | `ambient light`                      |

**Examples**

**Natural light**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        The image shows morning sunlight streaming onto the ground of a dense forest, with silver-white rays penetrating the treetops, creating dappled light and shadow, creating a realistic and serene atmosphere.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Natural light" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902574.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Backlight**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Shows that in a backlit environment, the model's contour lines become more distinct, with golden light and silk surrounding the model, creating a dreamlike halo effect. The entire scene is full of artistic atmosphere, showcasing high-level photography techniques and creativity.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Backlight" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902575.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Neon light**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        City street scene after rain, neon lights reflect colorful rays on the wet ground. Pedestrians hurry by with umbrellas, vehicles slowly drive through the bizarre streets, leaving colorful trails. The entire image is filled with the mystery and romance of the urban night, as if each raindrop is telling a story of the city.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Neon light" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902576.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>

**Ambient light**

<table style={{width: "100%", borderCollapse: "collapse", tableLayout: "fixed"}}>
  <tbody>
    <tr>
      <td style={{verticalAlign: "top", width: "55%", paddingRight: "12px"}}>
        Romantic artistic scene by the river at night, ambient lights gently illuminate the water surface, a group of lotus lanterns slowly drift toward the center of the river, the light and the rippling water surface reflect each other, creating a dreamlike visual effect.
      </td>

      <td style={{verticalAlign: "top", width: "45%", paddingLeft: "12px"}}>
        <img alt="Ambient light" src="https://help-static-aliyun-doc.aliyuncs.com/assets/img/en-US/2031097471/p902577.png" style={{display: "block", width: "100%", margin: "0 0 8px 0"}} />
      </td>
    </tr>
  </tbody>
</table>
