import urllib.request, json
url = "https://nidaamka-maamulka-hantida.onrender.com/api/activities"
resp = urllib.request.urlopen(url)
data = json.loads(resp.read())
found = False
for a in data:
    if "English Grade 12" in str(a):
        print(f"Deleting ID {a['id']}")
        req = urllib.request.Request(f"{url}/{a['id']}", method="DELETE")
        urllib.request.urlopen(req)
        print("Deleted successfully!")
        found = True

url2 = "https://nidaamka-maamulka-hantida.onrender.com/api/items"
resp2 = urllib.request.urlopen(url2)
data2 = json.loads(resp2.read())
for i in data2:
    if "English Grade 12" in str(i):
        print(f"Deleting Item ID {i['id']}")
        # Ensure your backend supports this, if not it will skip
        try:
            req = urllib.request.Request(f"{url2}/{i['id']}", method="DELETE")
            urllib.request.urlopen(req)
            print("Item Deleted successfully!")
        except:
            pass

if not found:
    print("Activity not found")
