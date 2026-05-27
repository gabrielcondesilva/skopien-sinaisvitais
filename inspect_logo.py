from PIL import Image

img = Image.open('public/logo_branca.png').convert('RGBA')
pixels = img.load()
w, h = img.size

THRESHOLD = 30  # alpha threshold for "meaningful" content

def count_pad(axis):
    if axis == 'top':
        for y in range(h):
            if any(pixels[x, y][3] > THRESHOLD for x in range(w)):
                return y
        return h
    if axis == 'left':
        for x in range(w):
            if any(pixels[x, y][3] > THRESHOLD for y in range(h)):
                return x
        return w
    if axis == 'bottom':
        for y in range(h-1, -1, -1):
            if any(pixels[x, y][3] > THRESHOLD for x in range(w)):
                return h - y - 1
        return h
    if axis == 'right':
        for x in range(w-1, -1, -1):
            if any(pixels[x, y][3] > THRESHOLD for y in range(h)):
                return w - x - 1
        return w

top = count_pad('top')
left = count_pad('left')
bottom = count_pad('bottom')
right = count_pad('right')
print(f'Padding: top={top} left={left} bottom={bottom} right={right}')
print(f'Content area: ({left}, {top}, {w-right}, {h-bottom})')
print(f'Content size: {w-left-right} x {h-top-bottom}')
