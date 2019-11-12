from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
chrome_options = Options()
# chrome_options.add_argument("--disable-extensions")
# chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
# chrome_options.add_argument("--headless")
browser = webdriver.Chrome(options=chrome_options)

browser.get('https://www.englandstats.com/hhhindex.php')
tables = browser.find_elements_by_css_selector(
    'ul.table:nth-child(2)')

f = open('output.csv', 'w')
# f.write( str(datetime.now().date() ) )
# f.write("\n")

for table in tables:
    subtables = table.find_elements_by_css_selector('ul')
    for ul in subtables:
        listitems = ul.find_elements_by_css_selector('li')
        for li in listitems:
            if li.text != "":
                f.write(li.text + ",")
        f.write("\n")

f.close()
browser.close()
# print(element.text)
