/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '2rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		fontFamily: {
  			sans: [
  				'Poppins',
  				'var(--font-inter)',
  				'system-ui',
  				'sans-serif'
  			],
  			serif: [
  				'var(--font-lora)',
  				'Georgia',
  				'serif'
  			]
  		},
  		colors: {
  			brand: {
  				'50': '#E6F7E6',
  				'100': '#CCEFCD',
  				'200': '#99DF9B',
  				'300': '#66CF69',
  				'400': '#33BF37',
  				'500': '#00B207',
  				'600': '#009006',
  				'700': '#006D04',
  				'800': '#004B03',
  				'900': '#002801',
  				DEFAULT: '#00B207'
  			},
  			earth: {
  				'50': '#F5F0E8',
  				'100': '#EBE1D1',
  				'200': '#D7C3A3',
  				'300': '#C3A575',
  				'400': '#AF8747',
  				'500': '#9B6919',
  				'600': '#8B4513',
  				'700': '#6F370F',
  				'800': '#53290B',
  				'900': '#371B07',
  				DEFAULT: '#8B4513'
  			},
  			orange: {
  				'50': '#FFF4E6',
  				'100': '#FFE9CC',
  				'200': '#FFD399',
  				'300': '#FFBD66',
  				'400': '#FFA733',
  				'500': '#FF8A00',
  				'600': '#CC6E00',
  				'700': '#995300',
  				'800': '#663700',
  				'900': '#331C00',
  				DEFAULT: '#FF8A00'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			success: 'hsl(var(--success))',
  			warning: 'hsl(var(--warning))',
  			danger: 'hsl(var(--danger))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			},
  			fadeUp: {
  				from: {
  					opacity: '0',
  					transform: 'translateY(12px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			slideInX: {
  				from: {
  					opacity: '0',
  					transform: 'translateX(24px)'
  				},
  				to: {
  					opacity: '1',
  					transform: 'translateX(0)'
  				}
  			},
  			shimmer: {
  				'0%': {
  					transform: 'translateX(-100%)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			scanLine: {
  				'0%': {
  					transform: 'translateY(-100%)'
  				},
  				'100%': {
  					transform: 'translateY(100%)'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-up': 'fadeUp 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
  			'slide-in-x': 'slideInX 0.38s cubic-bezier(0.16, 1, 0.3, 1)',
  			shimmer: 'shimmer 1.2s linear infinite',
  			'scan-line': 'scanLine 2.4s linear infinite'
  		},
  		boxShadow: {
  			soft: '0 2px 10px hsl(0 0% 0% / 0.25)',
  			elevated: '0 8px 28px hsl(0 0% 0% / 0.40)',
  			glow: '0 0 0 1px hsl(var(--border)/0.9), 0 0 24px hsl(var(--brand)/0.25)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}