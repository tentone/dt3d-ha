package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type HelloHandler struct{}

func NewHelloHandler() *HelloHandler {
	return &HelloHandler{}
}

func (h *HelloHandler) Register(router gin.IRouter) {
	router.GET("/hello", func(c *gin.Context) {
		c.String(http.StatusOK, "Hello from DT3D backend")
	})
}
