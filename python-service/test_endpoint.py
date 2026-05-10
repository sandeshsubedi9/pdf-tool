import requests

try:
    with open('test.pdf', 'rb') as f:
        res = requests.post('http://localhost:8000/edit/extract-content', files={'file': f})
        print("Status:", res.status_code)
        if res.status_code != 200:
            print(res.text)
        else:
            data = res.json()
            for p in data['pages']:
                print(f"Page {p['page_number']}: {len(p['images'])} images")
except Exception as e:
    print('Failed to request:', e)
