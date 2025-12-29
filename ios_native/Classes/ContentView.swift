import SwiftUI

struct ContentView: View {
    var body: some View {
        WebView(url: Config.initialURL)
            .edgesIgnoringSafeArea(.all) // Use various combinations if you want to respect safe areas
            .statusBar(hidden: true) // Optional: hide status bar for full immersion
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
