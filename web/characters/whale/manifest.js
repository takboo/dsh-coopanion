export const builtinWhale = {
  "format": "dsh-character",
  "formatVersion": 1,
  "id": "whale",
  "name": "小鲸",
  "author": "dsh-coopanion contributors",
  "license": "MIT",
  "description": "原创蓝色小鲸。会眨眼、摇尾巴，完成任务时挥挥鳍。",
  "canvas": {
    "width": 220,
    "height": 185
  },
  "renderer": {
    "type": "layers",
    "layers": [
      {
        "id": "tail",
        "image": "assets/tail.png",
        "width": 220,
        "height": 185,
        "pivotX": 0.7954545454545454,
        "pivotY": 0.654054054054054
      },
      {
        "id": "body",
        "image": "assets/body.png",
        "width": 220,
        "height": 185
      },
      {
        "id": "fin",
        "image": "assets/fin.png",
        "width": 220,
        "height": 185,
        "pivotX": 0.6363636363636364,
        "pivotY": 0.6486486486486487
      },
      {
        "id": "eyes",
        "image": "assets/eyes.png",
        "width": 220,
        "height": 185,
        "pivotX": 0.4090909090909091,
        "pivotY": 0.4864864864864865
      },
      {
        "id": "closed",
        "image": "assets/closed.png",
        "width": 220,
        "height": 185,
        "opacity": 0
      },
      {
        "id": "spout",
        "image": "assets/spout.png",
        "width": 220,
        "height": 185,
        "pivotX": 0.42272727272727273,
        "pivotY": 0.1837837837837838
      }
    ],
    "animations": {
      "idle": {
        "durationMs": 5000,
        "tracks": [
          {
            "layer": "tail",
            "property": "rotation",
            "keys": [
              {
                "at": 0,
                "value": 0
              },
              {
                "at": 0.5,
                "value": 9
              },
              {
                "at": 1,
                "value": 0
              }
            ]
          },
          {
            "layer": "eyes",
            "property": "scaleY",
            "keys": [
              {
                "at": 0,
                "value": 1
              },
              {
                "at": 0.43,
                "value": 1
              },
              {
                "at": 0.45,
                "value": 0.08
              },
              {
                "at": 0.47,
                "value": 1
              },
              {
                "at": 1,
                "value": 1
              }
            ]
          },
          {
            "layer": "spout",
            "property": "scaleY",
            "keys": [
              {
                "at": 0,
                "value": 1
              },
              {
                "at": 0.5,
                "value": 0.86
              },
              {
                "at": 1,
                "value": 1
              }
            ]
          }
        ]
      },
      "happy": {
        "durationMs": 1000,
        "tracks": [
          {
            "layer": "tail",
            "property": "rotation",
            "keys": [
              {
                "at": 0,
                "value": 0
              },
              {
                "at": 0.5,
                "value": 9
              },
              {
                "at": 1,
                "value": 0
              }
            ]
          },
          {
            "layer": "eyes",
            "property": "scaleY",
            "keys": [
              {
                "at": 0,
                "value": 1
              },
              {
                "at": 0.43,
                "value": 1
              },
              {
                "at": 0.45,
                "value": 0.08
              },
              {
                "at": 0.47,
                "value": 1
              },
              {
                "at": 1,
                "value": 1
              }
            ]
          },
          {
            "layer": "spout",
            "property": "scaleY",
            "keys": [
              {
                "at": 0,
                "value": 1
              },
              {
                "at": 0.5,
                "value": 0.86
              },
              {
                "at": 1,
                "value": 1
              }
            ]
          },
          {
            "layer": "fin",
            "property": "rotation",
            "keys": [
              {
                "at": 0,
                "value": 0
              },
              {
                "at": 0.5,
                "value": -20
              },
              {
                "at": 1,
                "value": 0
              }
            ]
          }
        ]
      },
      "sleeping": {
        "durationMs": 4000,
        "tracks": [
          {
            "layer": "eyes",
            "property": "opacity",
            "keys": [
              {
                "at": 0,
                "value": 0
              }
            ]
          },
          {
            "layer": "closed",
            "property": "opacity",
            "keys": [
              {
                "at": 0,
                "value": 1
              }
            ]
          },
          {
            "layer": "spout",
            "property": "opacity",
            "keys": [
              {
                "at": 0,
                "value": 0.4
              }
            ]
          }
        ]
      }
    }
  }
};
