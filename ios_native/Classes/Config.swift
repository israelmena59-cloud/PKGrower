import Foundation

struct Config {
    // Set this to true to use localhost, false for production
    static let useLocal: Bool = true

    // Your local development URL
    static let localURL = URL(string: "http://localhost:5173")!

    // Your production URL
    static let productionURL = URL(string: "https://pk-grower.web.app")!

    // Logic to select the correct URL
    static var initialURL: URL {
        return useLocal ? localURL : productionURL
    }
}
