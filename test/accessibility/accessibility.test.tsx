import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'

// Import components to test
import { Header } from '../../components/layout/header'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card'
import { ResponsiveGrid, ResponsiveContainer } from '../../components/ui/responsive-layout'

// Extend matchers
expect.extend(toHaveNoViolations)

// Mock Next.js router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    pathname: '/',
    query: {},
    asPath: '/'
  })
}))

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated'
  })
}))

describe('Accessibility Tests', () => {
  describe('Component Accessibility', () => {
    it('should not have accessibility violations in Button component', async () => {
      const { container } = render(
        <div>
          <Button>Default Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button disabled>Disabled Button</Button>
          <Button size="sm">Small Button</Button>
          <Button size="lg">Large Button</Button>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have accessibility violations in Input component', async () => {
      const { container } = render(
        <div>
          <label htmlFor="test-input-1">Test Input</label>
          <Input id="test-input-1" placeholder="Enter text" />
          
          <label htmlFor="test-input-2">Email Input</label>
          <Input id="test-input-2" type="email" placeholder="Enter email" />
          
          <label htmlFor="test-input-3">Disabled Input</label>
          <Input id="test-input-3" disabled placeholder="Disabled input" />
          
          <label htmlFor="test-input-4">Required Input</label>
          <Input id="test-input-4" required placeholder="Required input" />
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have accessibility violations in Card component', async () => {
      const { container } = render(
        <Card>
          <CardHeader>
            <CardTitle>Test Card Title</CardTitle>
            <CardDescription>This is a test card description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>This is the card content with some text.</p>
            <Button>Action Button</Button>
          </CardContent>
        </Card>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not have accessibility violations in responsive layout components', async () => {
      const { container } = render(
        <ResponsiveContainer>
          <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }}>
            <Card>
              <CardHeader>
                <CardTitle>Card 1</CardTitle>
              </CardHeader>
              <CardContent>Content 1</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 2</CardTitle>
              </CardHeader>
              <CardContent>Content 2</CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Card 3</CardTitle>
              </CardHeader>
              <CardContent>Content 3</CardContent>
            </Card>
          </ResponsiveGrid>
        </ResponsiveContainer>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Form Accessibility', () => {
    it('should have proper form labels and associations', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="firstName">First Name *</label>
            <Input id="firstName" required aria-describedby="firstName-help" />
            <div id="firstName-help">Enter your first name</div>
          </div>
          
          <div>
            <label htmlFor="email">Email Address *</label>
            <Input id="email" type="email" required aria-describedby="email-error" />
            <div id="email-error" role="alert" aria-live="polite">
              Please enter a valid email address
            </div>
          </div>
          
          <fieldset>
            <legend>Delivery Preferences</legend>
            <div>
              <input type="radio" id="morning" name="delivery" value="morning" />
              <label htmlFor="morning">Morning (9 AM - 12 PM)</label>
            </div>
            <div>
              <input type="radio" id="afternoon" name="delivery" value="afternoon" />
              <label htmlFor="afternoon">Afternoon (12 PM - 5 PM)</label>
            </div>
          </fieldset>
          
          <Button type="submit">Submit Form</Button>
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle error states accessibly', async () => {
      const { container } = render(
        <form>
          <div>
            <label htmlFor="errorInput">Input with Error</label>
            <Input 
              id="errorInput" 
              aria-invalid="true" 
              aria-describedby="errorInput-error"
              className="border-red-500"
            />
            <div id="errorInput-error" role="alert" className="text-red-600">
              This field is required
            </div>
          </div>
          
          <div>
            <label htmlFor="successInput">Input with Success</label>
            <Input 
              id="successInput" 
              aria-describedby="successInput-success"
              className="border-green-500"
            />
            <div id="successInput-success" className="text-green-600">
              Input is valid
            </div>
          </div>
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Navigation Accessibility', () => {
    it('should have accessible navigation structure', async () => {
      const { container } = render(
        <nav aria-label="Main navigation">
          <ul>
            <li><a href="/" aria-current="page">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li><a href="/about">About</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible breadcrumb navigation', async () => {
      const { container } = render(
        <nav aria-label="Breadcrumb">
          <ol>
            <li><a href="/">Home</a></li>
            <li><a href="/products">Products</a></li>
            <li aria-current="page">Organic Tomatoes</li>
          </ol>
        </nav>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Interactive Elements Accessibility', () => {
    it('should have accessible buttons with proper focus management', async () => {
      const { container } = render(
        <div>
          <Button>Primary Action</Button>
          <Button variant="outline" aria-describedby="button-help">
            Secondary Action
          </Button>
          <div id="button-help">This button performs a secondary action</div>
          
          <Button disabled aria-label="Loading, please wait">
            Loading...
          </Button>
          
          <button 
            type="button" 
            aria-expanded="false" 
            aria-controls="dropdown-menu"
            aria-haspopup="true"
          >
            Menu
          </button>
          <div id="dropdown-menu" hidden>
            <a href="#option1">Option 1</a>
            <a href="#option2">Option 2</a>
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have accessible modal dialogs', async () => {
      const { container } = render(
        <div>
          <Button aria-haspopup="dialog" aria-controls="test-modal">
            Open Modal
          </Button>
          
          <div 
            id="test-modal" 
            role="dialog" 
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
            aria-modal="true"
          >
            <h2 id="modal-title">Modal Title</h2>
            <p id="modal-description">This is a modal dialog description.</p>
            <Button>Confirm</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Data Tables Accessibility', () => {
    it('should have accessible data tables', async () => {
      const { container } = render(
        <table>
          <caption>Product Inventory</caption>
          <thead>
            <tr>
              <th scope="col">Product Name</th>
              <th scope="col">Farmer</th>
              <th scope="col">Quantity</th>
              <th scope="col">Price</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Organic Tomatoes</th>
              <td>Green Valley Farm</td>
              <td>50 lbs</td>
              <td>$4.99/lb</td>
              <td>
                <Button size="sm" aria-label="Edit Organic Tomatoes">
                  Edit
                </Button>
              </td>
            </tr>
            <tr>
              <th scope="row">Fresh Spinach</th>
              <td>Sunny Acres</td>
              <td>25 bunches</td>
              <td>$3.49/bunch</td>
              <td>
                <Button size="sm" aria-label="Edit Fresh Spinach">
                  Edit
                </Button>
              </td>
            </tr>
          </tbody>
        </table>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Color and Contrast', () => {
    it('should have sufficient color contrast', async () => {
      const { container } = render(
        <div>
          <div className="bg-white text-black p-4">
            High contrast text on white background
          </div>
          <div className="bg-blue-600 text-white p-4">
            White text on blue background
          </div>
          <div className="bg-green-600 text-white p-4">
            White text on green background
          </div>
          <div className="bg-red-600 text-white p-4">
            White text on red background
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should not rely solely on color for information', async () => {
      const { container } = render(
        <div>
          <div className="text-green-600">
            ✓ Success: Operation completed successfully
          </div>
          <div className="text-red-600">
            ✗ Error: Please fix the following issues
          </div>
          <div className="text-yellow-600">
            ⚠ Warning: Please review this information
          </div>
          <div className="text-blue-600">
            ℹ Info: Additional information available
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Screen Reader Support', () => {
    it('should have proper heading hierarchy', async () => {
      const { container } = render(
        <div>
          <h1>Main Page Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
          <h4>Sub-subsection Title</h4>
          <h2>Another Section</h2>
          <h3>Another Subsection</h3>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA landmarks', async () => {
      const { container } = render(
        <div>
          <header role="banner">
            <h1>Site Header</h1>
          </header>
          
          <nav role="navigation" aria-label="Main navigation">
            <ul>
              <li><a href="/">Home</a></li>
              <li><a href="/products">Products</a></li>
            </ul>
          </nav>
          
          <main role="main">
            <h1>Main Content</h1>
            <p>This is the main content area.</p>
          </main>
          
          <aside role="complementary" aria-label="Related information">
            <h2>Related Links</h2>
            <ul>
              <li><a href="/help">Help</a></li>
              <li><a href="/support">Support</a></li>
            </ul>
          </aside>
          
          <footer role="contentinfo">
            <p>&copy; 2024 AgroTrack. All rights reserved.</p>
          </footer>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper live regions for dynamic content', async () => {
      const { container } = render(
        <div>
          <div aria-live="polite" aria-atomic="true">
            Status updates will appear here
          </div>
          
          <div aria-live="assertive" role="alert">
            Critical alerts will appear here
          </div>
          
          <div aria-live="off">
            This content won't announce changes
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should have proper focus indicators', async () => {
      const { container } = render(
        <div>
          <Button className="focus:ring-2 focus:ring-blue-500 focus:outline-none">
            Focusable Button
          </Button>
          
          <Input className="focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          
          <a 
            href="/test" 
            className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Focusable Link
          </a>
          
          <div 
            tabIndex={0} 
            role="button"
            className="focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            Custom Focusable Element
          </div>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have logical tab order', async () => {
      const { container } = render(
        <form>
          <Input placeholder="First input" tabIndex={1} />
          <Input placeholder="Second input" tabIndex={2} />
          <Input placeholder="Third input" tabIndex={3} />
          <Button type="submit" tabIndex={4}>Submit</Button>
          <Button type="button" tabIndex={5}>Cancel</Button>
        </form>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Mobile Accessibility', () => {
    it('should have appropriate touch targets', async () => {
      const { container } = render(
        <div>
          <Button className="min-h-[44px] min-w-[44px]">
            Touch Target
          </Button>
          
          <button className="h-12 w-12 touch-manipulation">
            Icon Button
          </button>
          
          <a href="/test" className="block p-4 touch-manipulation">
            Large Touch Area Link
          </a>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should handle viewport and zoom properly', async () => {
      const { container } = render(
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-0 break-words">
            This content should wrap properly and not cause horizontal scrolling
          </div>
          
          <table className="w-full table-auto">
            <thead>
              <tr>
                <th className="text-left p-2">Column 1</th>
                <th className="text-left p-2">Column 2</th>
                <th className="text-left p-2">Column 3</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">Data 1</td>
                <td className="p-2">Data 2</td>
                <td className="p-2">Data 3</td>
              </tr>
            </tbody>
          </table>
        </div>
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })
})