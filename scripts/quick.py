import csv

data = csv.reader(open("./data/csv/73story/node_data.csv"))
"""
Node Name,Node ID,H1,H2,V,Restraint UH1,Restraint UH2,Restraint UV,Restraint RH1,Restraint RH2,Restraint RV
1,1,4556.5,3919.8,4800.0,Free,Free,Free,Free,Free,Free
2,2,4733.3,3916.0,4800.0,Free,Free,Free,Free,Free,Free
3,3,4552.6,3919.8,4968.0,Free,Free,Free,Free,Free,Free
"""

print(data)


allV = []

i = 0
for row in data:
    if i == 0:
        i += 1
        continue
    name = row[0]
    id = row[1]
    h1 = row[2]
    h2 = row[3]
    v = row[4]
    allV.append(v)
    # print(name, id, h1, h2, v)


uniqueV = list(set(allV))

print("uniqueV", uniqueV, len(uniqueV))

floatV = [float(v) for v in uniqueV]

sortedV = sorted(floatV)

print("sortedV", sortedV, len(sortedV))

minV = sortedV[0]
maxV = sortedV[-1]

print("minV", minV)
print("maxV", maxV)

sortedV = [v - minV for v in sortedV]

length = len(sortedV)

heights = [0]

for i in range(1, length):
    heights.append(sortedV[i] - sortedV[i - 1])

print("heights", heights)

for i in range(length):
    print(sortedV[i], heights[i])


print("Story level,Story Height (ft)")

for i in range(length - 1, -1, -1):
    height = heights[i] / 12
    story = i + 1
    print(f"{story},{height:.2f}")
